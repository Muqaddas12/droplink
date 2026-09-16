package com.muqaddas123.droplink.localshare

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.muqaddas123.droplink.MainActivity

object LocalShareNotification {

    const val CHANNEL_ID = "local_share_server"
    const val NOTIFICATION_ID = 4101

    fun createChannel(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            ?: return

        val channel = NotificationChannel(
            CHANNEL_ID,
            "Local Share Server",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows when DropLink Local Share server is actively running."
            setShowBadge(false)
        }
        manager.createNotificationChannel(channel)
    }

    fun buildNotification(context: Context, url: String): Notification {
        createChannel(context)

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle("DropLink Server Active")
            .setContentText("Listening at $url")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("DropLink is active in background.\nConnect at: $url")
            )
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    fun show(context: Context, url: String) {
        try {
            val notification = buildNotification(context, url)
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
        } catch (error: SecurityException) {
            Log.w("DropLink", "Notification permission was not granted.", error)
        }
    }

    fun clear(context: Context) {
        try {
            NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
        } catch (_: Exception) {}
    }
}
