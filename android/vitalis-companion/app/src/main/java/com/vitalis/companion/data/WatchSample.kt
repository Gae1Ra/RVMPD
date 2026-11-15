package com.vitalis.companion.data

/**
 * Aggregate sample matching POST /api/ingest/watch (CONTRACT / samsung-watch-bridge.md).
 * Missing sensors stay null — never invent clinical values.
 */
data class WatchSample(
    val device: String = "galaxy_watch",
    val tDevice: String?,
    val hr: Double?,
    val spo2: Double?,
    val temp: Double?,
    val hrvRmssd: Double?,
    val sqi: Map<String, Double?>,
    val artifact: Boolean = false,
    val permissions: List<String>,
)
