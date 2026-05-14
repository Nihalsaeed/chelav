package expo.modules.smspermission

import android.Manifest
import android.content.ContentResolver
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.os.Build
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SmsPermissionModule : Module() {
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

        Events("onPermissionResult")
    }
}