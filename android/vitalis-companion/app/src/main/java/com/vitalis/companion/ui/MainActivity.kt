package com.vitalis.companion.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.vitalis.companion.R
import com.vitalis.companion.data.CompanionPrefs
import com.vitalis.companion.databinding.ActivityMainBinding
import com.vitalis.companion.health.HealthConnectReader
import com.vitalis.companion.service.SyncBus
import com.vitalis.companion.service.WatchSyncService
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: CompanionPrefs
    private lateinit var reader: HealthConnectReader

    private val permissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract(),
    ) { granted ->
        val hrOk = HealthConnectReader.PERM_HR in granted
        Toast.makeText(
            this,
            if (hrOk) "Health Connect permissions updated" else "HR permission still missing",
            Toast.LENGTH_SHORT,
        ).show()
        refreshStatusChip()
    }

    private val notifPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* optional for FGS notification on API 33+ */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = CompanionPrefs(this)
        reader = HealthConnectReader(this)

        binding.backendUrl.setText(prefs.baseUrl)
        binding.hintText.text = HINT

        binding.btnPermissions.setOnClickListener { requestHealthPermissions() }
        binding.btnStart.setOnClickListener { onStartSync() }
        binding.btnStop.setOnClickListener {
            WatchSyncService.stop(this)
            prefs.syncing = false
        }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                SyncBus.state.collect { render(it) }
            }
        }

        maybeRequestNotificationPermission()
        refreshStatusChip()
    }

    override fun onResume() {
        super.onResume()
        refreshStatusChip()
    }

    private fun onStartSync() {
        val url = binding.backendUrl.text?.toString()?.trim().orEmpty()
        if (url.isBlank() || !url.startsWith("http")) {
            Toast.makeText(this, "Set a valid backend URL (http://PC-LAN-IP:8000)", Toast.LENGTH_LONG).show()
            return
        }
        prefs.baseUrl = url

        when (reader.availability()) {
            HealthConnectReader.Availability.NotInstalled,
            HealthConnectReader.Availability.UpdateRequired,
            -> {
                Toast.makeText(this, "Install / update Health Connect first", Toast.LENGTH_LONG).show()
                openHealthConnectStore()
                return
            }
            HealthConnectReader.Availability.Available -> Unit
        }

        lifecycleScope.launch {
            val client = reader.clientOrNull() ?: return@launch
            val granted = reader.grantedPermissions(client)
            if (HealthConnectReader.PERM_HR !in granted) {
                Toast.makeText(
                    this@MainActivity,
                    "Grant Health Connect read permissions first",
                    Toast.LENGTH_LONG,
                ).show()
                requestHealthPermissions()
                return@launch
            }
            WatchSyncService.start(this@MainActivity)
        }
    }

    private fun requestHealthPermissions() {
        when (reader.availability()) {
            HealthConnectReader.Availability.NotInstalled,
            HealthConnectReader.Availability.UpdateRequired,
            -> {
                openHealthConnectStore()
                binding.btnPermissions.setText(R.string.install_health_connect)
            }
            HealthConnectReader.Availability.Available -> {
                permissionLauncher.launch(HealthConnectReader.REQUIRED_PERMISSIONS)
            }
        }
    }

    private fun openHealthConnectStore() {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(HealthConnectReader.playStoreUri())))
        } catch (_: Exception) {
            startActivity(
                Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=${HealthConnectReader.PROVIDER_PACKAGE}"),
                ),
            )
        }
    }

    private fun refreshStatusChip() {
        lifecycleScope.launch {
            val status = when (val a = reader.availability()) {
                HealthConnectReader.Availability.Available -> {
                    val client = reader.clientOrNull()
                    val granted = client?.let { reader.grantedPermissions(it) }.orEmpty()
                    when {
                        HealthConnectReader.PERM_HR in granted -> "Health Connect: ready"
                        else -> "Health Connect: grant permissions"
                    }
                }
                HealthConnectReader.Availability.UpdateRequired -> "Health Connect: update required"
                HealthConnectReader.Availability.NotInstalled -> "Health Connect: not installed"
            }
            if (!SyncBus.state.value.syncing) {
                SyncBus.update { it.copy(connectStatus = status) }
            }
        }
    }

    private fun render(state: SyncBus.UiState) {
        binding.statusChip.text = state.connectStatus +
            (state.lastError?.let { " · $it" } ?: "")
        binding.hrValue.text = state.hr?.let { "${it.toInt()} bpm" } ?: "— bpm"
        binding.spo2Value.text = state.spo2?.let { "${"%.0f".format(it)} %" } ?: "—"
        binding.tempValue.text = state.temp?.let { "${"%.1f".format(it)} °C" } ?: "—"
        binding.hrvValue.text = state.hrv?.let { "${"%.0f".format(it)} ms" } ?: "—"
        binding.lastSync.text = "Last sync: ${state.lastSyncLabel}"
        binding.btnStart.isEnabled = !state.syncing
        binding.btnStop.isEnabled = state.syncing
    }

    private fun maybeRequestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            val granted = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                notifPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    companion object {
        private val HINT = """
            Phone-first path: Galaxy Watch → Samsung Health → Health Connect → this app → VITALIS.
            Set your PC LAN IP, run the backend with --host 0.0.0.0, then open the UI in Galaxy Watch demo mode.
            No raw ECG/PPG. Missing sensors stay blank (null). Decision support only.
        """.trimIndent()
    }
}
