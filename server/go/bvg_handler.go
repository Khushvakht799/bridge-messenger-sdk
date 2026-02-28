package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

// Intent represents the purpose of a message
type Intent struct {
	Primary    string  `json:"primary"`
	Confidence float64 `json:"confidence,omitempty"`
}

// State represents the dynamic state of a message
type State struct {
	Timestamp int64  `json:"timestamp"`
	Sender    string `json:"sender"`
	Receiver  string `json:"receiver"`
	Status    string `json:"status,omitempty"`
}

// Content holds the actual message data
type Content struct {
	Text  string `json:"text,omitempty"`
	Media []byte `json:"media,omitempty"`
}

// Meta combines intent and state
type Meta struct {
	Intent Intent `json:"intent"`
	State  State  `json:"state"`
}

// BVGMessage is the top-level structure
type BVGMessage struct {
	ID      string  `json:"id"`
	Type    string  `json:"type"`
	Content Content `json:"content"`
	Meta    Meta    `json:"meta"`
}

// Simple in-memory store for evolution records
type EvolutionStore struct {
	mu      sync.RWMutex
	records map[string][]string // messageID -> list of events
}

func NewEvolutionStore() *EvolutionStore {
	return &EvolutionStore{
		records: make(map[string][]string),
	}
}

func (s *EvolutionStore) AddEvent(messageID, event string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records[messageID] = append(s.records[messageID], event)
}

func (s *EvolutionStore) GetEvents(messageID string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.records[messageID]
}

// MessageHandler processes incoming BVG messages
type MessageHandler struct {
	evolution *EvolutionStore
}

func NewMessageHandler() *MessageHandler {
	return &MessageHandler{
		evolution: NewEvolutionStore(),
	}
}

// HandleMessage processes a single BVG message
func (h *MessageHandler) HandleMessage(data []byte) error {
	var msg BVGMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		return fmt.Errorf("failed to parse BVG message: %w", err)
	}

	// Log received message
	log.Printf("Received message %s from %s to %s (intent: %s)",
		msg.ID, msg.Meta.State.Sender, msg.Meta.State.Receiver, msg.Meta.Intent.Primary)

	// Store evolution record
	h.evolution.AddEvent(msg.ID, fmt.Sprintf("received at %d", time.Now().Unix()))

	// Route based on intent
	switch msg.Meta.Intent.Primary {
	case "chat":
		// Store delivery record
		h.evolution.AddEvent(msg.ID, "delivered")
		// In real implementation: forward to receiver
	case "group":
		// Handle group message
		h.evolution.AddEvent(msg.ID, "routed_to_group")
	default:
		log.Printf("Unknown intent: %s", msg.Meta.Intent.Primary)
	}

	return nil
}

// HTTP handler for BVG messages
func (h *MessageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read request body
	var data []byte
	_, err := r.Body.Read(data)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Process message
	if err := h.HandleMessage(data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"ok"}`)
}

func main() {
	handler := NewMessageHandler()

	// Register HTTP handler
	http.Handle("/bvg", handler)

	// Start server
	port := ":8080"
	log.Printf("BVG server starting on port %s", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal(err)
	}
}