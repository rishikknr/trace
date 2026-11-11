import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import {
  Annotation,
  Compartment,
  EditorState,
  Transaction,
} from "@codemirror/state";
import { sql } from "@codemirror/lang-sql";

const syncedValue = Annotation.define<boolean>();
export function CodeEditor({
  value,
  language,
  readOnly = false,
  onChange,
}: {
  value: string;
  language: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    editor = useRef<EditorView | null>(null),
    change = useRef(onChange);
  const settings = useRef(new Compartment());
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        extensions: [
          basicSetup,
          settings.current.of([]),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            "aria-label": "Expression",
            "aria-multiline": "true",
          }),
          EditorState.transactionFilter.of((tr) =>
            !tr.annotation(syncedValue) && tr.newDoc.length > 100000 ? [] : tr,
          ),
          EditorView.updateListener.of((update) => {
            if (
              update.docChanged &&
              !update.transactions.some((tr) => tr.annotation(syncedValue))
            ) {
              change.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    editor.current = view;
    return () => {
      view.destroy();
      editor.current = null;
    };
  }, []);
  useEffect(() => {
    editor.current?.dispatch({
      effects: settings.current.reconfigure([
        ...(language === "SQL" ? [sql()] : []),
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    });
  }, [language, readOnly]);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.doc.toString() !== value)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        annotations: [syncedValue.of(true), Transaction.addToHistory.of(false)],
      });
  }, [value]);
  return (
    <div>
      <span className="field-label">Expression</span>
      <div className="code-editor" ref={host} />
      <small>
        SQL highlighting and multiline keyboard editing. Tab moves focus; use
        editor indentation commands. DAX is stored text; no Power BI execution
        or full syntax validation.
      </small>
    </div>
  );
}
