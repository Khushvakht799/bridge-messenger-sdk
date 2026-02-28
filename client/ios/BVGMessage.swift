import Foundation

struct Intent: Codable {
    let primary: String
    let confidence: Double?
    
    init(primary: String, confidence: Double = 1.0) {
        self.primary = primary
        self.confidence = confidence
    }
}

struct State: Codable {
    let timestamp: Int64
    let sender: String
    let receiver: String
    let status: String
    
    init(timestamp: Int64, sender: String, receiver: String, status: String = "sent") {
        self.timestamp = timestamp
        self.sender = sender
        self.receiver = receiver
        self.status = status
    }
}

struct Content: Codable {
    let text: String?
    let media: Data?
    
    init(text: String? = nil, media: Data? = nil) {
        self.text = text
        self.media = media
    }
}

struct Meta: Codable {
    let intent: Intent
    let state: State
}

struct BVGMessage: Codable {
    let id: String
    let type: String
    let content: Content
    let meta: Meta
    
    init(id: String = UUID().uuidString,
         type: String = "message",
         content: Content,
         meta: Meta) {
        self.id = id
        self.type = type
        self.content = content
        self.meta = meta
    }
    
    func serialize() -> Data? {
        let encoder = JSONEncoder()
        return try? encoder.encode(self)
    }
    
    static func deserialize(_ data: Data) -> BVGMessage? {
        let decoder = JSONDecoder()
        return try? decoder.decode(BVGMessage.self, from: data)
    }
    
    static func createTextMessage(text: String, from: String, to: String) -> BVGMessage {
        return BVGMessage(
            content: Content(text: text),
            meta: Meta(
                intent: Intent(primary: "chat"),
                state: State(
                    timestamp: Int64(Date().timeIntervalSince1970 * 1000),
                    sender: from,
                    receiver: to
                )
            )
        )
    }
}