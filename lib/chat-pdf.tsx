"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer"

/* ── Register default font ── */
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf", fontWeight: 700 },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Inter",
    fontSize: 10,
    color: "#16130F",
    backgroundColor: "#FAFAF8",
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#18382A",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#18382A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#776F63",
  },
  messageContainer: {
    marginBottom: 12,
  },
  roleLabel: {
    fontSize: 8,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#776F63",
    marginBottom: 3,
  },
  userBubble: {
    backgroundColor: "#18382A",
    color: "#FFFFFF",
    padding: 10,
    borderRadius: 8,
    borderTopRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    color: "#16130F",
    padding: 10,
    borderRadius: 8,
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: "#E3DBCE",
  },
  messageText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#B0A898",
  },
  watermark: {
    fontSize: 8,
    color: "#B0A898",
  },
})

interface ChatMessage {
  role: "user" | "assistant"
  text: string
}

function ChatPDFDocument({ messages, title }: { messages: ChatMessage[]; title: string }) {
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <Document title={title} author="NutriAI" subject="Chat Export">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Exported from NutriAI on {date}</Text>
        </View>

        {messages.map((msg, i) => (
          <View key={i} style={styles.messageContainer}>
            <Text style={styles.roleLabel}>
              {msg.role === "user" ? "You" : "NutriAI"}
            </Text>
            <View style={msg.role === "user" ? styles.userBubble : styles.aiBubble}>
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.watermark}>NutriAI — Private & Confidential</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

export async function generateChatPDF(messages: ChatMessage[], title: string) {
  const blob = await pdf(<ChatPDFDocument messages={messages} title={title} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${title.replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "-")}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
