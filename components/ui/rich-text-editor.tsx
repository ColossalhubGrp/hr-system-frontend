"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { useEffect } from "react"
import StarterKit from "@tiptap/starter-kit"
import { Button } from "@/components/ui/button"
import {
    Bold,
    Italic,
    Strikethrough,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    Code,
    Quote,
    Undo,
    Redo,
} from "lucide-react"

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = "Enter text...",
    className = "",
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [StarterKit],
        content: value,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: "prose prose-sm focus:outline-none w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " + (className || ""),
            },
        },
    })

    useEffect(() => {
        if (!editor) return
        const current = editor.getHTML()
        if (value !== current) {
            // TipTap v3 takes an options object here; we're on v2 (React 18 compat)
            // so the second positional arg is the `emitUpdate` boolean.
            editor.commands.setContent(value || "", false)
        }
    }, [editor, value])

    if (!editor) {
        return null
    }

    return (
        <div className="w-full border border-input rounded-md overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-1 bg-muted p-2 border-b border-input">
                <Button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    variant={editor.isActive("bold") ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Bold (Ctrl+B)"
                >
                    <Bold className="h-4 w-4" />
                </Button>

                <Button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    variant={editor.isActive("italic") ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Italic (Ctrl+I)"
                >
                    <Italic className="h-4 w-4" />
                </Button>

                <Button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    variant={editor.isActive("strike") ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Strikethrough"
                >
                    <Strikethrough className="h-4 w-4" />
                </Button>

                <div className="w-px bg-border mx-1" />

                <Button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    variant={editor.isActive("heading", { level: 1 }) ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Heading 1"
                >
                    <Heading1 className="h-4 w-4" />
                </Button>

                <Button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </Button>

                <div className="w-px bg-border mx-1" />

                <Button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    variant={editor.isActive("bulletList") ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </Button>

                <Button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    variant={editor.isActive("orderedList") ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Ordered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>

                <Button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    variant={editor.isActive("codeBlock") ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Code Block"
                >
                    <Code className="h-4 w-4" />
                </Button>

                <Button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    variant={editor.isActive("blockquote") ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Blockquote"
                >
                    <Quote className="h-4 w-4" />
                </Button>

                <div className="w-px bg-border mx-1" />

                <Button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo className="h-4 w-4" />
                </Button>

                <Button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo className="h-4 w-4" />
                </Button>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} className="min-h-[300px]" />
        </div>
    )
}
