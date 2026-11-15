package com.vitalis.companion.health

import android.content.Context
import android.os.Build
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.SkinTemperatureRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.vitalis.companion.data.WatchSample
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Reads Galaxy Watch–synced vitals via **official Health Connect**.
 *
 * Phone-first path: Samsung Health / Wear OS writes into Health Connect when the
 * user grants sharing. We do **not** use Samsung private APIs.
 *
 * Samsung Health Data SDK is only needed later for Samsung-only metrics that
 * Health Connect does not expose — not used in this companion.
 */
class HealthConnectReader(private val context: Context) {

    sealed class Availability {
        data object Available : Availability()
        data object UpdateRequired : Availability()
        data object NotInstalled : Availability()
    }

    fun availability(): Availability {
        return when (HealthConnectClient.getSdkStatus(context, PROVIDER_PACKAGE)) {
            HealthConnectClient.SDK_AVAILABLE -> Availability.Available
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> Availability.UpdateRequired
            else -> Availability.NotInstalled
        }
    }

    fun clientOrNull(): HealthConnectClient? {
        return if (availability() is Availability.Available) {
            HealthConnectClient.getOrCreate(context)
        } else {
            null
        }
    }

    suspend fun grantedPermissions(client: HealthConnectClient): Set<String> {
        return client.permissionController.getGrantedPermissions()
    }

    /**
     * Latest aggregates in a recent window. Null fields mean no sample — never invented.
     */
    suspend fun readLatest(client: HealthConnectClient): WatchSample {
        val granted = grantedPermissions(client)
        val end = Instant.now()
        val start = end.minus(2, ChronoUnit.HOURS)
        val range = TimeRangeFilter.between(start, end)

        val hr = if (PERM_HR in granted) latestHeartRate(client, range) else null
        val spo2 = if (PERM_SPO2 in granted) latestSpo2(client, range) else null
        val temp = if (PERM_TEMP in granted) latestSkinTemp(client, range) else null
        val hrv = if (PERM_HRV in granted) latestHrv(client, range) else null

        val permissionLabels = buildList {
            if (PERM_HR in granted) add("READ_HEART_RATE")
            if (PERM_SPO2 in granted) add("READ_OXYGEN_SATURATION")
            if (PERM_TEMP in granted) add("READ_SKIN_TEMPERATURE")
            if (PERM_HRV in granted) add("READ_HEART_RATE_VARIABILITY")
        }

        val tDevice = listOfNotNull(hr?.second, spo2?.second, temp?.second, hrv?.second)
            .maxOrNull()
            ?.toString()

        return WatchSample(
            tDevice = tDevice,
            hr = hr?.first,
            spo2 = spo2?.first,
            temp = temp?.first,
            hrvRmssd = hrv?.first,
            sqi = mapOf(
                "hr" to hr?.let { 0.9 },
                "spo2" to spo2?.let { 0.85 },
                "temp" to temp?.let { 0.8 },
                "hrv_rmssd" to hrv?.let { 0.8 },
            ),
            artifact = false,
            permissions = permissionLabels,
        )
    }

    private suspend fun latestHeartRate(
        client: HealthConnectClient,
        range: TimeRangeFilter,
    ): Pair<Double, Instant>? {
        val response = client.readRecords(
            ReadRecordsRequest(HeartRateRecord::class, timeRangeFilter = range),
        )
        val sample = response.records
            .flatMap { rec -> rec.samples.map { it to rec.endTime } }
            .maxByOrNull { it.first.time }
            ?: return null
        return sample.first.beatsPerMinute.toDouble() to sample.first.time
    }

    private suspend fun latestSpo2(
        client: HealthConnectClient,
        range: TimeRangeFilter,
    ): Pair<Double, Instant>? {
        val response = client.readRecords(
            ReadRecordsRequest(OxygenSaturationRecord::class, timeRangeFilter = range),
        )
        val rec = response.records.maxByOrNull { it.time } ?: return null
        // Health Connect Percentage for SpO₂ is already 0..100 (CONTRACT uses %).
        return rec.percentage.value to rec.time
    }

    private suspend fun latestSkinTemp(
        client: HealthConnectClient,
        range: TimeRangeFilter,
    ): Pair<Double, Instant>? {
        // SkinTemperatureRecord availability depends on Health Connect version / OEM.
        return try {
            val response = client.readRecords(
                ReadRecordsRequest(SkinTemperatureRecord::class, timeRangeFilter = range),
            )
            val rec = response.records.maxByOrNull { it.endTime } ?: return null
            val delta = rec.deltas.maxByOrNull { it.time } ?: return null
            // Absolute baseline + delta when present; else skip (null).
            val baseline = rec.baseline?.inCelsius
            val celsius = if (baseline != null) {
                baseline + delta.delta.inCelsius
            } else {
                // Without baseline we only have relative deltas — do not invent absolute temp.
                return null
            }
            celsius to delta.time
        } catch (_: Throwable) {
            null
        }
    }

    private suspend fun latestHrv(
        client: HealthConnectClient,
        range: TimeRangeFilter,
    ): Pair<Double, Instant>? {
        return try {
            val response = client.readRecords(
                ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, timeRangeFilter = range),
            )
            val rec = response.records.maxByOrNull { it.time } ?: return null
            rec.heartRateVariabilityMillis to rec.time
        } catch (_: Throwable) {
            null
        }
    }

    companion object {
        const val PROVIDER_PACKAGE = "com.google.android.apps.healthdata"

        val PERM_HR = HealthPermission.getReadPermission(HeartRateRecord::class)
        val PERM_SPO2 = HealthPermission.getReadPermission(OxygenSaturationRecord::class)
        val PERM_TEMP = HealthPermission.getReadPermission(SkinTemperatureRecord::class)
        val PERM_HRV = HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class)

        val REQUIRED_PERMISSIONS: Set<String> = setOf(PERM_HR, PERM_SPO2, PERM_TEMP, PERM_HRV)

        fun playStoreUri(): String =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                // Android 14+ often ships Health Connect as a system module.
                "market://details?id=$PROVIDER_PACKAGE"
            } else {
                "market://details?id=$PROVIDER_PACKAGE"
            }
    }
}
