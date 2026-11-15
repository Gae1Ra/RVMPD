package com.vitalis.companion.data

import android.content.Context
import android.content.SharedPreferences

/**
 * Configurable VITALIS backend base URL (LAN IP for contest demos).
 * Example: http://192.168.1.42:8000
 */
class CompanionPrefs(context: Context) {
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    var baseUrl: String
        get() = prefs.getString(KEY_BASE_URL, DEFAULT_BASE_URL)?.trim()?.trimEnd('/')
            ?: DEFAULT_BASE_URL
        set(value) {
            prefs.edit().putString(KEY_BASE_URL, value.trim().trimEnd('/')).apply()
        }

    var syncing: Boolean
        get() = prefs.getBoolean(KEY_SYNCING, false)
        set(value) {
            prefs.edit().putBoolean(KEY_SYNCING, value).apply()
        }

    companion object {
        private const val PREFS = "vitalis_companion"
        private const val KEY_BASE_URL = "base_url"
        private const val KEY_SYNCING = "syncing"
        const val DEFAULT_BASE_URL = "http://192.168.1.42:8000"
    }
}
