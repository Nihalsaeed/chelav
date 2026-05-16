package expo.modules.smspermission

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class SmsForegroundService : Service() {
    companion object {
        const val CHANNEL_ID = "sms_auto_sync_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "expo.modules.smspermission.START_SERVICE"
        const val ACTION_STOP = "expo.modules.smspermission.STOP_SERVICE"

        var onNewSmsReceived: ((address: String, body: String, timestamp: Long) -> Unit)? = null
    }

    private var smsReceiver: BroadcastReceiver? = null
    private var isRegistered = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopListening()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            else -> {
                startForeground(NOTIFICATION_ID, buildNotification())
                startListening()
            }
        }
        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SMS Auto Sync",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps listening for new bank SMS messages"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): android.app.Notification {
        val stopIntent = Intent(this, SmsForegroundService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SMS Auto Sync Active")
            .setContentText("Listening for new bank messages...")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPendingIntent)
            .build()
    }

    private fun startListening() {
        if (isRegistered) return

        smsReceiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                if (intent?.action != "android.provider.Telephony.SMS_RECEIVED") return

                val bundle = intent.extras ?: return
                val pdus = bundle.get("pdus") as? Array<*> ?: return

                for (pdu in pdus) {
                    try {
                        val pduBytes = pdu as? ByteArray ?: continue
                        val smsMessage = android.telephony.SmsMessage.createFromPdu(pduBytes)
                        smsMessage?.let {
                            SmsPermissionModule.onSmsReceivedCallback?.invoke(
                                it.originatingAddress ?: "",
                                it.messageBody ?: "",
                                it.timestampMillis
                            )
                        }
                    } catch (e: Exception) {
                        // Skip malformed messages
                    }
                }
            }
        }

        val filter = IntentFilter("android.provider.Telephony.SMS_RECEIVED")
        registerReceiver(smsReceiver, filter)
        isRegistered = true
    }

    private fun stopListening() {
        if (!isRegistered) return
        smsReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (e: Exception) {
                // Not registered
            }
            smsReceiver = null
            isRegistered = false
        }
    }

    override fun onDestroy() {
        stopListening()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}