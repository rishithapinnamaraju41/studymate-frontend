package com.studymate.backend.controllers;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.studymate.backend.service.ChatStore;
import com.studymate.backend.service.OllamaService;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class StudyMateController {

    record ChatRequest(String mode, List<Map<String, String>> messages) {}

    record ConversationChatRequest(String conversationId, String mode, String message) {}

    private final OllamaService ollamaService;
    private final ChatStore chatStore;

    public StudyMateController(OllamaService ollamaService, ChatStore chatStore) {
        this.ollamaService = ollamaService;
        this.chatStore = chatStore;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "success", "message", "AI StudyMate backend is running!");
    }

    @PostMapping("/chat")
    public Map<String, String> chat(@RequestBody ChatRequest request) {
        String answer = ollamaService.chat(request.mode(), request.messages());
        return Map.of("answer", answer);
    }

    @PostMapping("/conversations/chat")
    public Map<String, String> conversationChat(@RequestBody ConversationChatRequest request) {
        String question = request.message() == null ? "" : request.message().trim();
        if (question.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is empty");
        }
        String mode = request.mode() == null ? "tutor" : request.mode();

        String id = request.conversationId();
        if (id == null || id.isBlank() || !chatStore.exists(id)) {
            String title = question.length() > 50 ? question.substring(0, 50) + "..." : question;
            id = chatStore.createConversation(title, mode);
        }

        chatStore.addMessage(id, "user", question);

        List<Map<String, String>> all = chatStore.messages(id);
        int from = Math.max(0, all.size() - 20);
        String answer = ollamaService.chat(mode, all.subList(from, all.size()));

        chatStore.addMessage(id, "assistant", answer);
        return Map.of("conversationId", id, "answer", answer);
    }

    @GetMapping("/conversations")
    public List<ChatStore.ConversationSummary> conversations() {
        return chatStore.listConversations();
    }

    @GetMapping("/conversations/{id}/messages")
    public List<Map<String, String>> conversationMessages(@PathVariable String id) {
        return chatStore.messages(id);
    }

    @DeleteMapping("/conversations/{id}")
    public void deleteConversation(@PathVariable String id) {
        chatStore.delete(id);
    }
}