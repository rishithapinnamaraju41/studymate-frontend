package com.studymate.backend.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class ChatStore {

    public record ConversationSummary(String id, String title, String mode, String createdAt) {}

    private final JdbcClient jdbc;

    public ChatStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public String createConversation(String title, String mode) {
        String id = UUID.randomUUID().toString();
        jdbc.sql("INSERT INTO conversations (id, title, study_mode) VALUES (:id, :title, :mode)")
                .param("id", id)
                .param("title", title)
                .param("mode", mode)
                .update();
        return id;
    }

    public boolean exists(String id) {
        Long count = jdbc.sql("SELECT COUNT(*) FROM conversations WHERE id = :id")
                .param("id", id)
                .query(Long.class)
                .single();
        return count != null && count > 0;
    }

    public void addMessage(String conversationId, String role, String content) {
        jdbc.sql("INSERT INTO messages (conversation_id, msg_role, msg_content) VALUES (:cid, :role, :content)")
                .param("cid", conversationId)
                .param("role", role)
                .param("content", content)
                .update();
    }

    public List<Map<String, String>> messages(String conversationId) {
        return jdbc.sql("SELECT msg_role, msg_content FROM messages WHERE conversation_id = :id ORDER BY id")
                .param("id", conversationId)
                .query((rs, rowNum) -> Map.of(
                        "role", rs.getString("msg_role"),
                        "content", rs.getString("msg_content")))
                .list();
    }

    public List<ConversationSummary> listConversations() {
        return jdbc.sql("SELECT id, title, study_mode, created_at FROM conversations ORDER BY created_at DESC")
                .query((rs, rowNum) -> new ConversationSummary(
                        rs.getString("id"),
                        rs.getString("title"),
                        rs.getString("study_mode"),
                        rs.getTimestamp("created_at").toString()))
                .list();
    }

    public void delete(String id) {
        jdbc.sql("DELETE FROM messages WHERE conversation_id = :id").param("id", id).update();
        jdbc.sql("DELETE FROM conversations WHERE id = :id").param("id", id).update();
    }
}