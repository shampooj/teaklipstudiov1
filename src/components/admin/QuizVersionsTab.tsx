import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  QUIZ_VERSIONS,
  fetchQuizVersionSettings,
  liveVersions,
  trafficShares,
  type QuizVersionSetting,
} from "@/lib/quizVersions";

// Admin tab: switch quiz versions on/off and set how traffic splits between
// the ones that are on. Versions themselves are built in code, so this lists
// every version the current deploy knows about; one with no saved row is off.

type Draft = Record<string, QuizVersionSetting>;

const toDraft = (rows: QuizVersionSetting[]): Draft => {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return Object.fromEntries(
    QUIZ_VERSIONS.map((v) => [v.key, byKey.get(v.key) ?? { key: v.key, enabled: false, weight: 0, notes: null }]),
  );
};

const QuizVersionsTab = () => {
  const qc = useQueryClient();
  const saved = useQuery({ queryKey: ["quiz-versions"], queryFn: fetchQuizVersionSettings });

  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (saved.data) setDraft(toDraft(saved.data));
  }, [saved.data]);

  const rows = QUIZ_VERSIONS.map((v) => ({ def: v, setting: draft[v.key] })).filter((r) => r.setting);
  const live = useMemo(() => liveVersions(Object.values(draft)), [draft]);
  const shares = useMemo(() => trafficShares(live), [live]);
  const dirty = saved.data ? JSON.stringify(toDraft(saved.data)) !== JSON.stringify(draft) : false;
  const allZero = live.length > 1 && live.every((v) => v.weight <= 0);

  const update = (key: string, patch: Partial<QuizVersionSetting>) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));

  const toggle = (key: string, enabled: boolean) => {
    if (!enabled && live.length === 1 && live[0].key === key) {
      toast.error("At least one version has to stay on");
      return;
    }
    // Turning a version on with no weight would give it no traffic.
    update(key, enabled && draft[key].weight <= 0 ? { enabled, weight: 50 } : { enabled });
  };

  const save = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await (supabase.from as any)("quiz_versions").upsert(
      Object.values(draft).map((s) => ({
        key: s.key,
        enabled: s.enabled,
        weight: Math.max(0, Math.round(s.weight)),
        notes: s.notes?.trim() || null,
        updated_at: now,
      })),
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["quiz-versions"] });
    toast.success("Quiz versions saved. New visitors get the new split on their next page load.");
  };

  if (saved.isLoading) return <p className="text-muted-foreground text-sm text-center py-8">Loading quiz versions…</p>;
  if (saved.error) {
    // PGRST205: the quiz_versions migration hasn't reached this database yet.
    const missing = (saved.error as { code?: string }).code === "PGRST205";
    return (
      <p className="text-destructive text-sm text-center py-8">
        {missing
          ? "The quiz versions table isn't in this database yet. It's created when the migration deploys. Until then every visitor gets Version 1."
          : "Couldn't load quiz versions."}
      </p>
    );
  }

  return (
    <div className="border border-border rounded-2xl p-5 space-y-5">
      <div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Quiz Versions</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Visitors are split between the versions that are on, by weight. Weights are relative, so 3 and 1 means
          75% / 25%. Each visitor keeps their version until they reload the page. Filter Analytics by version to
          compare them.
        </p>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1.5 px-3 font-normal">Version</th>
              <th className="py-1.5 px-3 font-normal">On</th>
              <th className="py-1.5 px-3 font-normal">Weight</th>
              <th className="py-1.5 px-3 font-normal text-right">Traffic</th>
              <th className="py-1.5 px-3 font-normal">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ def, setting }) => (
              <tr key={def.key} className="border-t border-border/60 align-top">
                <td className="py-2 px-3">
                  <p className="text-xs font-medium">{def.label}</p>
                  <p className="text-muted-foreground mt-0.5 max-w-xs">{def.description}</p>
                </td>
                <td className="py-2 px-3">
                  <Switch checked={setting.enabled} onCheckedChange={(on) => toggle(def.key, on)} aria-label={`${def.label} on`} />
                </td>
                <td className="py-2 px-3">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={setting.weight}
                    disabled={!setting.enabled}
                    onChange={(e) => update(def.key, { weight: Math.max(0, Number(e.target.value) || 0) })}
                    className="h-7 w-20 text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right font-mono text-xs">
                  {shares.has(def.key) ? `${Math.round(shares.get(def.key)! * 100)}%` : "off"}
                </td>
                <td className="py-2 px-3">
                  <Input
                    value={setting.notes ?? ""}
                    placeholder="What's different in this version"
                    onChange={(e) => update(def.key, { notes: e.target.value })}
                    className="h-7 min-w-[200px] text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {allZero && <p className="text-[10px] text-muted-foreground">Every live version has weight 0, so traffic splits evenly.</p>}

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {dirty && (
          <button
            type="button"
            onClick={() => saved.data && setDraft(toDraft(saved.data))}
            className="text-[10px] uppercase tracking-normal text-muted-foreground underline hover:text-foreground"
          >
            Discard changes
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizVersionsTab;
