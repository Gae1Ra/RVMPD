package com.vitalis.companion.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.vitalis.companion.R
import com.vitalis.companion.data.CompanionPrefs
import com.vitalis.companion.health.HealthConnectReader
import com.vitalis.companion.net.IngestClient
import com.vitalis.companion.ui.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Foreground service: poll Health Connect ~1 Hz and POST to VITALIS ingest.
 */
class WatchSyncService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var loopJob: Job? = null
    private lateinit var prefs: CompanionPrefs
    private lateinit var reader: HealthConnectReader
    private lateinit var ingest: IngestClient

    override fun onCreate() {
        super.onCreate()
        prefs = CompanionPrefs(this)
        reader = HealthConnectReader(this)
        ingest = IngestClient { prefs.baseUrl }
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopSync()
                return START_NOT_STICKY
            }
            else -> startSync()
        }
        return START_STICKY
    }

    private fun startSync() {
        prefs.syncing = true
        val notification = buildNotification(getString(R.string.sync_notification_text))
        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID,
            notification,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
            } else {
                0
            },
        )

        SyncBus.update {
            it.copy(syncing = true, connectStatus = "Syncing · Health Connect", lastError = null)
        }

        if (loopJob?.isActive == true) return
        loopJob = scope.launch {
            while (isActive) {
                tick()
                delay(POLL_MS)
            }
        }
    }

    private suspend fun tick() {
        val client = reader.clientOrNull()
        if (client == null) {
            SyncBus.update {
                it.copy(
                    connectStatus = "Health Connect not available",
                    lastError = "Install or update Health Connect",
                )
            }
            return
        }

        val granted = reader.grantedPermissions(client)
        if (HealthConnectReader.PERM_HR !in granted) {
            SyncBus.update {
                it.copy(
                    connectStatus = "Missing HR permission",
                    lastError = "Grant Health Connect permissions",
                )
            }
            return
        }

        val sample = try {
            reader.readLatest(client)
        } catch (e: Exception) {
            SyncBus.update {
                it.copy(connectStatus = "Read failed", lastError = e.message)
            }
            return
        }

        if (sample.hr == null && sample.spo2 == null && sample.temp == null && sample.hrvRmssd == null) {
            SyncBus.update {
                it.copy(
                    connectStatus = "No recent samples",
                    lastError = "Wear the watch; ensure Samsung Health syncs to Health Connect",
                )
            }
            // Still POST nulls? Prefer skip empty posts to avoid stomping good data.
            return
        }

        val result = ingest.post(sample)
        val timeLabel = result.lastSync
            ?: DateTimeFormatter.ofPattern("HH:mm:ss")
                .withZone(ZoneId.systemDefault())
                .format(java.time.Instant.now())

        SyncBus.update {
            it.copy(
                syncing = true,
                connectStatus = if (result.ok) "Syncing · Galaxy Watch via Health Connect" else "POST failed",
                hr = sample.hr ?: it.hr,
                spo2 = sample.spo2 ?: it.spo2,
                temp = sample.temp ?: it.temp,
                hrv = sample.hrvRmssd ?: it.hrv,
                lastSyncLabel = if (result.ok) timeLabel else it.lastSyncLabel,
                lastError = if (result.ok) null else result.message,
            )
        }
    }

    private fun stopSync() {
        prefs.syncing = false
        loopJob?.cancel()
        loopJob = null
        SyncBus.resetIdle("Stopped")
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        loopJob?.cancel()
        scope.cancel()
        prefs.syncing = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createChannel() {
        val mgr = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.channel_sync),
            NotificationManager.IMPORTANCE_LOW,
        )
        mgr.createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val stop = PendingIntent.getService(
            this,
            1,
            Intent(this, WatchSyncService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.sync_notification_title))
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(open)
            .addAction(0, getString(R.string.stop_sync), stop)
            .setOngoing(true)
            .build()
    }

    companion object {
        const val ACTION_STOP = "com.vitalis.companion.STOP_SYNC"
        private const val CHANNEL_ID = "vitalis_watch_sync"
        private const val NOTIFICATION_ID = 42
        private const val POLL_MS = 1000L

        fun start(context: Context) {
            val intent = Intent(context, WatchSyncService::class.java)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, WatchSyncService::class.java).setAction(ACTION_STOP)
            context.startService(intent)
        }
    }
}
