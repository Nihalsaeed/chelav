package expo.modules.smspermission

import android.Manifest
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SmsPermissionModule : Module() {
    private var smsReceiver: BroadcastReceiver? = null
    private var isListening = false

    companion object {
        const val CHANNEL_ID = "sms_auto_sync_channel"
        const val NOTIFICATION_ID = 1001
        var onSmsReceivedCallback: ((address: String, body: String, timestamp: Long) -> Unit)? = null
    }

    override fun definition() = ModuleDefinition {
        Name("SmsPermission")

        AsyncFunction("requestSmsPermission") { promise: Promise ->
            val activity = appContext.activityProvider?.currentActivity
            if (activity == null) {
                promise.reject("E_ACTIVITY", "Activity not available", null)
                return@AsyncFunction
            }

            val permissions = mutableListOf(
                Manifest.permission.READ_SMS,
                Manifest.permission.RECEIVE_SMS
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            }

            activity.requestPermissions(permissions.toTypedArray(), 1001)
            promise.resolve(true)
        }

        Function("checkSmsPermission") {
            val context = appContext.reactContext ?: return@Function false
            val hasPermission = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.READ_SMS
            ) == PackageManager.PERMISSION_GRANTED
            hasPermission
        }

        AsyncFunction("getSmsMessages") { limit: Int?, promise: Promise ->
            val context = appContext.reactContext ?: run {
                promise.resolve(emptyList<Map<String, Any>>())
                return@AsyncFunction
            }

            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS)
                != PackageManager.PERMISSION_GRANTED) {
                promise.resolve(emptyList<Map<String, Any>>())
                return@AsyncFunction
            }

            CoroutineScope(Dispatchers.IO).launch {
                val messages = mutableListOf<Map<String, Any>>()
                val contentResolver: ContentResolver = context.contentResolver

                val uri: Uri = Uri.parse("content://sms/inbox")
                val projection: Array<String> = arrayOf(
                    "_id",
                    "address",
                    "body",
                    "date",
                    "type"
                )

                val sortOrder = "date DESC"
                val limitValue = limit ?: 100

                var cursor: Cursor? = null
                try {
                    cursor = contentResolver.query(uri, projection, null, null, sortOrder)
                    var count = 0
                    cursor?.let {
                        while (it.moveToNext() && count < limitValue) {
                            val message = mapOf(
                                "id" to it.getLong(it.getColumnIndexOrThrow("_id")),
                                "address" to (it.getString(it.getColumnIndexOrThrow("address")) ?: ""),
                                "body" to (it.getString(it.getColumnIndexOrThrow("body")) ?: ""),
                                "date" to it.getLong(it.getColumnIndexOrThrow("date")),
                                "type" to it.getInt(it.getColumnIndexOrThrow("type"))
                            )
                            messages.add(message)
                            count++
                        }
                    }
                } finally {
                    cursor?.close()
                }

                promise.resolve(messages)
            }
        }

        AsyncFunction("startSmsListener") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            if (isListening) return@AsyncFunction true

            smsReceiver = object : BroadcastReceiver() {
                override fun onReceive(ctx: Context?, intent: android.content.Intent?) {
                    if (intent?.action != "android.provider.Telephony.SMS_RECEIVED") return

                    val bundle = intent.extras ?: return
                    val pdus = bundle.get("pdus") as? Array<*> ?: return

                    for (pdu in pdus) {
                        try {
                            val pduBytes = pdu as? ByteArray ?: continue
                            val smsMessage = android.telephony.SmsMessage.createFromPdu(pduBytes)
                            smsMessage?.let {
                                val address = it.originatingAddress ?: ""
                                val body = it.messageBody ?: ""
                                val timestamp = it.timestampMillis

                                val messageData = mapOf(
                                    "address" to address,
                                    "body" to body,
                                    "date" to timestamp,
                                    "type" to 1
                                )
                                sendEvent("onSmsReceived", messageData)
                                onSmsReceivedCallback?.invoke(address, body, timestamp)
                            }
                        } catch (e: Exception) {
                            // Skip malformed messages
                        }
                    }
                }
            }

            val filter = IntentFilter("android.provider.Telephony.SMS_RECEIVED")
            context.registerReceiver(smsReceiver, filter)
            isListening = true
            true
        }

        AsyncFunction("stopSmsListener") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            smsReceiver?.let {
                try {
                    context.unregisterReceiver(it)
                } catch (e: Exception) {
                    // Receiver not registered
                }
                smsReceiver = null
            }
            isListening = false
            true
        }

        AsyncFunction("startForegroundService") {
            val context = appContext.reactContext ?: return@AsyncFunction false

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                    val activity = appContext.activityProvider?.currentActivity
                    activity?.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1002)
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = android.app.NotificationChannel(
                    CHANNEL_ID,
                    "SMS Auto Sync",
                    NotificationManager.IMPORTANCE_LOW
                )
                channel.description = "Keeps listening for new bank SMS messages"
                val manager = context.getSystemService(NotificationManager::class.java)
                manager.createNotificationChannel(channel)
            }

            val serviceIntent = Intent(context, SmsForegroundService::class.java).apply {
                action = SmsForegroundService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            true
        }

        AsyncFunction("stopForegroundService") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            val serviceIntent = Intent(context, SmsForegroundService::class.java).apply {
                action = SmsForegroundService.ACTION_STOP
            }
            context.startService(serviceIntent)
            true
        }

        AsyncFunction("showTransactionNotification") { amount: String, merchant: String, promise: Promise ->
            val context = appContext.reactContext ?: run {
                promise.resolve(false)
                return@AsyncFunction
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                    promise.resolve(false)
                    return@AsyncFunction
                }
            }

            val channelId = "transaction_notifications"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = android.app.NotificationChannel(
                    channelId,
                    "Transactions",
                    NotificationManager.IMPORTANCE_DEFAULT
                )
                channel.description = "New transaction notifications"
                val manager = context.getSystemService(NotificationManager::class.java)
                manager.createNotificationChannel(channel)
            }

            val notification = NotificationCompat.Builder(context, channelId)
                .setContentTitle("New Transaction: $amount")
                .setContentText("From: $merchant")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .build()

            val manager = context.getSystemService(NotificationManager::class.java)
            manager.notify(System.currentTimeMillis().toInt(), notification)
            promise.resolve(true)
        }

        Events("onPermissionResult", "onSmsReceived")
    }
}