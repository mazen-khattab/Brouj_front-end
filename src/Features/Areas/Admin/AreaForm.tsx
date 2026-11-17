import { CitySelector } from "./CitySelector";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Input } from "../../../Components/Fields";
import { Button } from "../../../Components/Button";
import { createArea, updateArea, getAreaById } from "../../../Services/Areas";
import { routePaths } from "../../../Router/browserPaths";
import { invalidFields } from "./validation";
import type { AreaDraft, AreaRecord } from "./types";
import { useAreaEditor } from "./EditorContext";
import { ValidationSummary } from "../../../Components/Feedback";

export default function AreaForm({
  data,
  refresh,
  readPending = false,
  onCreated,
}: {
  data?: AreaRecord;
  refresh: () => Promise<unknown>;
  readPending?: boolean;
  onCreated?: () => void;
}) {
  const { t } = useTranslation("admin");
  const action = useAreaEditor();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<AreaDraft>(() => ({ name: data?.name ?? "", cityId: data?.cityId ?? "" }));
  const [invalid, setInvalid] = useState<string[]>([]);
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const formKey = `record:area:${data?.id ?? "new"}`;
  const disabled = action.pending || action.blocked || readPending;

  function change(key: keyof AreaDraft, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    action.markDirty(formKey, JSON.stringify(next) !== baseline);
  }

  async function submit() {
    const errors = invalidFields(draft);
    setInvalid(errors);
    if (errors.length || disabled) {
      return;
    }
    let createdId = "";
    let writeSignal = new AbortController().signal;
    const result = await action.run(
      async (signal) => {
        writeSignal = signal;
        const body = { name: draft.name, cityId: draft.cityId };
        createdId = data ? await updateArea({ id: data.id, body }, { signal }) : await createArea({ body }, { signal });
        return createdId;
      },
      data
        ? refresh
        : async () => {
            // Confirm the returned create reference before moving to its editor.
            await getAreaById({ id: createdId }, { signal: writeSignal });
            await refresh();
          },
    );
    if (result) {
      action.markDirty(formKey, false);
      setBaseline(JSON.stringify(draft));
      if (!data) {
        onCreated?.();
        navigate(routePaths.admin.area(result));
      }
    }
  }

  function error(key: string) {
    const server = Object.keys(action.failure?.fieldErrors ?? {}).some((field) => field.split(".").at(-1)?.toLowerCase() === key.toLowerCase());
    return invalid.includes(key) || server ? t("invalid") : undefined;
  }

  return (
    <form
      className="grid min-w-0 gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      aria-label={t(data ? "editRecord" : "createRecord")}
    >
      <h2 className="text-2xl font-semibold">{t(data ? "editRecord" : "createRecord")}</h2>
      <p className="text-sm leading-7 text-muted">{t("formHint")}</p>
      <ValidationSummary
        items={["name", "cityId"]
          .filter((key) => error(key))
          .map((key) => ({ fieldId: `field-${key}`, message: `${t(`fields.${key}`)}: ${t("invalid")}` }))}
      />
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <Input
          id="field-name"
          label={t("fields.name")}
          value={draft.name}
          error={error("name")}
          disabled={disabled}
          maxLength={100}
          onChange={(event) => change("name", event.target.value)}
        />
        <CitySelector value={draft.cityId} onChange={(value) => change("cityId", value)} error={error("cityId")} disabled={disabled} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={action.pending} disabled={disabled}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
