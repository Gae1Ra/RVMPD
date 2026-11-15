package com.vitalis.companion.net

import com.vitalis.companion.data.WatchSample
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * POSTs watch aggregates to FastAPI POST /api/ingest/watch.
 */
class IngestClient(
    private val baseUrlProvider: () -> String,
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .writeTimeout(8, TimeUnit.SECONDS)
        .build()

    data class Result(
        val ok: Boolean,
        val message: String,
        val lastSync: String? = null,
    )

    fun post(sample: WatchSample): Result {
        val base = baseUrlProvider().trimEnd('/')
        val url = "$base/api/ingest/watch"
        val bodyJson = JSONObject().apply {
            put("device", sample.device)
            put("t_device", sample.tDevice)
            putNullable("hr", sample.hr)
            putNullable("spo2", sample.spo2)
            putNullable("temp", sample.temp)
            putNullable("hrv_rmssd", sample.hrvRmssd)
            put("sqi", JSONObject().apply {
                sample.sqi.forEach { (k, v) -> putNullable(k, v) }
            })
            put("artifact", sample.artifact)
            put("permissions", org.json.JSONArray(sample.permissions))
        }

        val request = Request.Builder()
            .url(url)
            .post(bodyJson.toString().toRequestBody(JSON))
            .header("Content-Type", "application/json")
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    Result(false, "HTTP ${response.code}: ${text.take(160)}")
                } else {
                    val parsed = runCatching { JSONObject(text) }.getOrNull()
                    Result(
                        ok = parsed?.optBoolean("ok", true) ?: true,
                        message = "Posted",
                        lastSync = parsed?.optString("last_sync")?.ifBlank { null },
                    )
                }
            }
        } catch (e: Exception) {
            Result(false, e.message ?: "Network error")
        }
    }

    private fun JSONObject.putNullable(key: String, value: Double?) {
        if (value == null) put(key, JSONObject.NULL) else put(key, value)
    }

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()
    }
}
