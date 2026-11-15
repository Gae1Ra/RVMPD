package com.vitalis.companion.service

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * In-process status bus so MainActivity can show last HR / sync without a binder.
 */
object SyncBus {
    data class UiState(
        val syncing: Boolean = false,
        val connectStatus: String = "Idle",
        val hr: Double? = null,
        val spo2: Double? = null,
        val temp: Double? = null,
        val hrv: Double? = null,
        val lastSyncLabel: String = "never",
        val lastError: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun update(transform: (UiState) -> UiState) {
        _state.value = transform(_state.value)
    }

    fun resetIdle(message: String = "Idle") {
        _state.value = _state.value.copy(syncing = false, connectStatus = message)
    }
}
