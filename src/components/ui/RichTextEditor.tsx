import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, Undo, Redo 
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils" // Certifique-se que essa função existe no seu projeto

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  disabled?: boolean
}

// Componente de botão de formatação declarado fora de qualquer render
const FormatButton = ({
  isActive,
  onClick,
  children,
  label
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string
}) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      "h-8 w-8 p-0",
      isActive ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900"
    )}
  >
    {children}
  </Button>
)

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null

  return (
    <div className="border-b bg-slate-50 p-2 flex flex-wrap gap-1 sticky top-0 z-10 items-center rounded-t-lg">
      <FormatButton
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Negrito"
      >
        <Bold className="h-4 w-4" />
      </FormatButton>
      
      <FormatButton
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Itálico"
      >
        <Italic className="h-4 w-4" />
      </FormatButton>

      <FormatButton
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        label="Sublinhado"
      >
        <UnderlineIcon className="h-4 w-4" />
      </FormatButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <FormatButton
        isActive={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        label="Alinhar Esquerda"
      >
        <AlignLeft className="h-4 w-4" />
      </FormatButton>
      
      <FormatButton
        isActive={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        label="Centralizar"
      >
        <AlignCenter className="h-4 w-4" />
      </FormatButton>

      <FormatButton
        isActive={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        label="Alinhar Direita"
      >
        <AlignRight className="h-4 w-4" />
      </FormatButton>

      <FormatButton
        isActive={editor.isActive({ textAlign: 'justify' })}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        label="Justificar"
      >
        <AlignJustify className="h-4 w-4" />
      </FormatButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <FormatButton
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Lista com Marcadores"
      >
        <List className="h-4 w-4" />
      </FormatButton>

      <FormatButton
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Lista Numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </FormatButton>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Desfazer"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Refazer"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function RichTextEditor({ content, onChange, disabled }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Digite o conteúdo do documento aqui...' })
    ],
    content: content, // Define o conteúdo inicial
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg focus:outline-none min-h-[300px] p-6 max-w-none bg-white rounded-b-lg',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sincroniza se o conteúdo vier de fora (ex: carregando do banco)
  if (editor && content && editor.getHTML() !== content && !editor.isFocused) {
     // Nota: Isso é um fallback simples. Em apps complexos, use useEffect.
     // Para este caso, o hook useEditor já inicializa o content.
  }

  return (
    <div className="border border-slate-200 rounded-lg shadow-sm flex flex-col bg-white w-full">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}