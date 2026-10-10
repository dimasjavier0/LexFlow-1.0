import { useState, type KeyboardEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Badge, Button, IconButton, Input, Select } from "../../components/ui";
import { addWordRelation, addWordSentence, deleteWordRelation, deleteWordSentence, type AdminWord } from "../../lib/admin-api";
import { RELATIONSHIP_LABELS, type WordRelationshipType } from "../../lib/word-details";

/** Same contract as the editor's media mutations: run a request, then fold its result into the word. */
export type MutateWord = <T>(request: (session: Session) => Promise<T>, apply: (current: AdminWord, result: T) => AdminWord, fallback: string) => Promise<void>;

type ExtrasProps = { word: AdminWord; mutate: MutateWord };

/** Keeps Enter inside a sub-form from submitting the whole word editor. */
function submitOnEnter(action: () => void) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    action();
  };
}

function Row({ children, onRemove, removeLabel }: { children: ReactNode; onRemove: () => void; removeLabel: string }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-paper/70 px-3 py-2 text-sm">
      <span className="min-w-0 flex-1">{children}</span>
      <IconButton label={removeLabel} tone="plain" className="size-7 text-xs" onClick={onRemove}>✕</IconButton>
    </li>
  );
}

export function SentenceList({ word, mutate }: ExtrasProps) {
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const add = async () => {
    if (!text.trim() || isAdding) return;
    setIsAdding(true);
    await mutate(
      (session) => addWordSentence(session, word.id, { text: text.trim(), translationEs: translation.trim() || null }),
      (current, sentence) => {
        setText("");
        setTranslation("");
        return { ...current, sentences: [...current.sentences, sentence] };
      },
      "No se pudo añadir la oración.",
    );
    setIsAdding(false);
  };

  return (
    <>
      {word.sentences.length ? (
        <ul className="m-0 grid list-none gap-1.5 p-0">
          {word.sentences.map((sentence) => (
            <Row
              key={sentence.id}
              removeLabel="Eliminar oración"
              onRemove={() => void mutate(
                (session) => deleteWordSentence(session, sentence.id),
                (current) => ({ ...current, sentences: current.sentences.filter((item) => item.id !== sentence.id) }),
                "No se pudo eliminar la oración.",
              )}
            >
              <span className="block">{sentence.text}</span>
              {sentence.translationEs ? <small className="block text-xs text-muted">{sentence.translationEs}</small> : null}
            </Row>
          ))}
        </ul>
      ) : <p className="m-0 text-xs text-muted">Sin oraciones todavía. Dan contexto real a la palabra durante la lección.</p>}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input aria-label="Oración en inglés" maxLength={300} placeholder="I eat an apple every day." value={text} onChange={(event) => setText(event.target.value)} onKeyDown={submitOnEnter(() => void add())} />
        <Input aria-label="Traducción de la oración" maxLength={300} placeholder="Traducción (opcional)" value={translation} onChange={(event) => setTranslation(event.target.value)} onKeyDown={submitOnEnter(() => void add())} />
        <Button variant="secondary" disabled={!text.trim()} isLoading={isAdding} loadingLabel="Añadiendo..." onClick={() => void add()}>Añadir</Button>
      </div>
    </>
  );
}

export function RelationList({ word, mutate }: ExtrasProps) {
  const [term, setTerm] = useState("");
  const [type, setType] = useState<WordRelationshipType>("SYNONYM");
  const [isAdding, setIsAdding] = useState(false);

  const add = async () => {
    if (!term.trim() || isAdding) return;
    setIsAdding(true);
    await mutate(
      (session) => addWordRelation(session, word.id, { term: term.trim(), type }),
      (current, relation) => {
        setTerm("");
        return { ...current, relationsFrom: [...current.relationsFrom, relation] };
      },
      "No se pudo añadir la relación.",
    );
    setIsAdding(false);
  };

  return (
    <>
      {word.relationsFrom.length ? (
        <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2">
          {word.relationsFrom.map((relation) => (
            <Row
              key={relation.id}
              removeLabel={`Eliminar relación con ${relation.target.term}`}
              onRemove={() => void mutate(
                (session) => deleteWordRelation(session, relation.id),
                (current) => ({ ...current, relationsFrom: current.relationsFrom.filter((item) => item.id !== relation.id) }),
                "No se pudo eliminar la relación.",
              )}
            >
              <Badge tone="neutral" className="mr-2">{RELATIONSHIP_LABELS[relation.type]}</Badge>
              <strong>{relation.target.term}</strong>
            </Row>
          ))}
        </ul>
      ) : <p className="m-0 text-xs text-muted">Sin relaciones. Enlaza sinónimos, antónimos o palabras derivadas que ya existan en la biblioteca.</p>}
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
        <Select aria-label="Tipo de relación" value={type} onChange={(event) => setType(event.target.value as WordRelationshipType)}>
          {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Input aria-label="Palabra relacionada" maxLength={100} placeholder="Palabra existente, p. ej. big" value={term} onChange={(event) => setTerm(event.target.value)} onKeyDown={submitOnEnter(() => void add())} />
        <Button variant="secondary" disabled={!term.trim()} isLoading={isAdding} loadingLabel="Añadiendo..." onClick={() => void add()}>Añadir</Button>
      </div>
    </>
  );
}
