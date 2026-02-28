package com.bridge.messenger

import kotlinx.serialization.*
import kotlinx.serialization.json.*
import java.util.*

@Serializable
data class Intent(
    val primary: String,
    val confidence: Float = 1.0f
)

@Serializable
data class State(
    val timestamp: Long,
    val sender: String,
    val receiver: String,
    val status: String = "sent" // sent, delivered, read
)

@Serializable
data class Content(
    val text: String? = null,
    val media: ByteArray? = null
)

@Serializable
data class BVGMessage(
    val id: String,
    val type: String = "message",
    val content: Content,
    val meta: Meta
) {
    @Serializable
    data class Meta(
        val intent: Intent,
        val state: State
    )

    fun serialize(): ByteArray {
        return Json.encodeToString(this).toByteArray()
    }

    companion object {
        fun deserialize(data: ByteArray): BVGMessage {
            val json = String(data)
            return Json.decodeFromString(json)
        }

        fun createTextMessage(text: String, from: String, to: String): BVGMessage {
            return BVGMessage(
                id = UUID.randomUUID().toString(),
                content = Content(text = text),
                meta = Meta(
                    intent = Intent(primary = "chat"),
                    state = State(
                        timestamp = System.currentTimeMillis(),
                        sender = from,
                        receiver = to
                    )
                )
            )
        }
    }
}