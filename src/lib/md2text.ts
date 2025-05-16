export default function stripMarkdown(markdown) {
    return markdown
        // 移除標題符號（# Title）
        .replace(/^#{1,6}\s+/gm, "")
        // 移除粗體（**bold** 或 __bold__）
        .replace(/(\*\*|__)(.*?)\1/g, "$2")
        // 移除斜體（*italic* 或 _italic_）
        .replace(/(\*|_)(.*?)\1/g, "$2")
        // 移除刪除線（~~strikethrough~~）
        .replace(/~~(.*?)~~/g, "$1")
        // 移除行內程式碼（`code`）
        .replace(/`([^`]*)`/g, "$1")
        // 移除多行程式碼塊（```code block```）
        .replace(/```[\s\S]*?```/g, "")
        // 移除超連結顯示的文本部分（[text](url) → text）
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        // 移除圖片標籤（![alt](url) → alt）
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
        // 移除 HTML 標籤
        .replace(/<[^>]*>/g, "")
        // 移除額外的空白行
        .replace(/^\s+|\s+$/g, "")
        .replace(/\n{2,}/g, "\n");
}