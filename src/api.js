const API = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error("Server error " + res.status);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const sendChat = (conversationId, mode, message) =>
  request("/api/conversations/chat", {
    method: "POST",
    body: JSON.stringify({ conversationId, mode, message }),
  });

export const listConversations = () => request("/api/conversations");

export const getMessages = (id) => request(`/api/conversations/${id}/messages`);

export const deleteConversation = (id) =>
  request(`/api/conversations/${id}`, { method: "DELETE" });