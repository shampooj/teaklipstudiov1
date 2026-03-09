import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface AdminLabel {
  id: string;
  image_id: string;
  admin_lip_tone_category: string | null;
  labeled_by_user_id: string | null;
  labeled_at: string | null;
  created_at?: string;
  labeled_by_email?: string;
  image_url?: string | null;
}

interface Submission {
  id: string;
  created_at: string;
  shade_id: string;
  shade_label: string;
  variant_id: string;
  image_id: string | null;
  image_url: string | null;
  // joined from admin_labels
  admin_lip_tone_category: string | null;
  labeled_by_user_id: string | null;
  labeled_at: string | null;
  labeled_by_email?: string;
  is_labeled: boolean;
  admin_label_id?: string;
}

const Dashboard = () => {
  const [data, setData] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [labelSearch, setLabelSearch] = useState("");
  const [adminLabels, setAdminLabels] = useState<AdminLabel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [{ data: rows, error }, { data: labels }, { data: profiles }] = await Promise.all([
      (supabase.from as any)("customer_submissions")
        .select("*")
        .order("created_at", { ascending: false }),
      (supabase.from as any)("admin_labels").select("*"),
      (supabase.from as any)("profiles").select("id, email"),
    ]);
    if (error) {
      console.error("Failed to fetch submissions:", error);
    } else {
      const emailMap = new Map<string, string>();
      (profiles || []).forEach((p: { id: string; email: string }) => emailMap.set(p.id, p.email));

      const labelMap = new Map<string, AdminLabel>();
      const submissionUrlMap = new Map<string, string | null>();
      (rows || []).forEach((r: any) => submissionUrlMap.set(r.id, r.image_url));
      const enrichedLabels = (labels || []).map((l: AdminLabel) => ({
        ...l,
        labeled_by_email: l.labeled_by_user_id ? emailMap.get(l.labeled_by_user_id) ?? undefined : undefined,
        image_url: submissionUrlMap.get(l.image_id) ?? null,
      }));
      enrichedLabels.forEach((l: AdminLabel) => labelMap.set(l.image_id, l));
      setAdminLabels(enrichedLabels);

      const enriched = (rows || []).map((r: any) => {
        const label = labelMap.get(r.id);
        return {
          ...r,
          is_labeled: !!label,
          admin_lip_tone_category: label?.admin_lip_tone_category ?? null,
          labeled_by_user_id: label?.labeled_by_user_id ?? null,
          labeled_at: label?.labeled_at ?? null,
          admin_label_id: label?.id,
          labeled_by_email: label?.labeled_by_user_id ? emailMap.get(label.labeled_by_user_id) ?? null : null,
        };
      });
      setData(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const unlabeled = useMemo(() => data.filter((r) => !r.is_labeled), [data]);
  const [labelIndex, setLabelIndex] = useState(0);
  const clampedIndex = Math.min(labelIndex, Math.max(0, unlabeled.length - 1));
  const currentImage = unlabeled.length > 0 ? unlabeled[clampedIndex] : null;

  const handleSaveLabel = async () => {
    if (!currentImage || !selectedCategory) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const { error } = await (supabase.from as any)("admin_labels")
      .insert({
        image_id: currentImage.id,
        admin_lip_tone_category: selectedCategory,
        labeled_by_user_id: user?.id,
        labeled_at: now,
      });
    if (!error) {
      await (supabase.from as any)("customer_submissions")
        .update({ is_labeled: true })
        .eq("id", currentImage.id);
    }
    if (error) {
      toast.error("Failed to save label");
      console.error(error);
    } else {
      toast.success("Label saved");
      setSelectedCategory("");
      setLabelIndex((prev) => Math.min(prev, unlabeled.length - 2));
      setData((prev) =>
        prev.map((r) =>
          r.id === currentImage.id
            ? {
                ...r,
                is_labeled: true,
                admin_lip_tone_category: selectedCategory,
                labeled_by_user_id: user?.id ?? null,
                labeled_at: now,
                labeled_by_email: user?.email ?? undefined,
              }
            : r
        )
      );
    }
    setSaving(false);
  };

  const handleRelabel = async (submissionId: string) => {
    // Find the admin label for this submission
    const label = adminLabels.find((l) => l.image_id === submissionId);
    if (!label) return;
    const { error } = await (supabase.from as any)("admin_labels")
      .delete()
      .eq("id", label.id);
    if (!error) {
      await (supabase.from as any)("customer_submissions")
        .update({ is_labeled: false })
        .eq("id", submissionId);
    }
    if (error) {
      toast.error("Failed to reset label");
    } else {
      toast.success("Moved back to labeling queue");
      setAdminLabels((prev) => prev.filter((l) => l.id !== label.id));
      setData((prev) =>
        prev.map((r) =>
          r.id === submissionId
            ? { ...r, is_labeled: false, admin_lip_tone_category: null, labeled_by_user_id: null, labeled_at: null, labeled_by_email: undefined, admin_label_id: undefined }
            : r
        )
      );
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (row) =>
        row.shade_id.toLowerCase().includes(q) ||
        row.shade_label.toLowerCase().includes(q) ||
        row.variant_id.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q) ||
        (row.image_id && row.image_id.toLowerCase().includes(q)) ||
        row.created_at.toLowerCase().includes(q)
    );
  }, [data, search]);

  const labeledSubmissions = useMemo(() => data.filter((r) => r.is_labeled), [data]);

  const filteredLabels = useMemo(() => {
    if (!labelSearch.trim()) return labeledSubmissions;
    const q = labelSearch.toLowerCase();
    return labeledSubmissions.filter(
      (row) =>
        row.id.toLowerCase().includes(q) ||
        row.shade_label.toLowerCase().includes(q) ||
        row.shade_id.toLowerCase().includes(q) ||
        (row.admin_lip_tone_category && row.admin_lip_tone_category.toLowerCase().includes(q)) ||
        (row.labeled_by_email && row.labeled_by_email.toLowerCase().includes(q)) ||
        (row.labeled_at && row.labeled_at.toLowerCase().includes(q))
    );
  }, [labeledSubmissions, labelSearch]);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Teak Lip Studio Admin
        </h1>

        <Card className="max-w-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Images Needing Manual Label
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {data.filter((r) => !r.is_labeled).length}
            </p>
          </CardContent>
        </Card>

        {currentImage ? (
          <Card className="max-w-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Label Image ({clampedIndex + 1} of {unlabeled.length})</span>
                <span className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-6 w-6" disabled={clampedIndex === 0} onClick={() => setLabelIndex(clampedIndex - 1)}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-6 w-6" disabled={clampedIndex >= unlabeled.length - 1} onClick={() => setLabelIndex(clampedIndex + 1)}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentImage.image_url ? (
                <img
                  src={currentImage.image_url}
                  alt="Submission"
                  className="w-full max-h-64 object-contain rounded-md border"
                />
              ) : (
                <p className="text-muted-foreground text-sm">No image available</p>
              )}
              <p className="text-xs text-muted-foreground">
                Shade: {currentImage.shade_label} · {new Date(currentImage.created_at).toLocaleDateString()}
              </p>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lip tone category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pink">Pink</SelectItem>
                  <SelectItem value="medium pink">Medium Pink</SelectItem>
                  <SelectItem value="two-toned">Two-Toned</SelectItem>
                  <SelectItem value="brown">Brown</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={handleSaveLabel} disabled={!selectedCategory || saving}>
                  {saving ? "Saving…" : "Save Label"}
                </Button>
                <Button variant="destructive" size="default" onClick={async () => {
                  if (!currentImage) return;
                  const { error } = await (supabase.from as any)("customer_submissions")
                    .delete()
                    .eq("id", currentImage.id);
                  if (error) {
                    toast.error("Failed to discard submission");
                  } else {
                    toast.success("Submission discarded");
                    setData((prev) => prev.filter((r) => r.id !== currentImage.id));
                    setLabelIndex((prev) => Math.min(prev, Math.max(0, unlabeled.length - 2)));
                  }
                }}>
                  Discard Customer Submission
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">All images have been labeled ✓</p>
        )}

        <h2 className="text-lg text-muted-foreground">Admin Labels</h2>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by image ID, lip tone, email…"
            value={labelSearch}
            onChange={(e) => setLabelSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredLabels.length === 0 ? (
          <p className="text-muted-foreground">No admin labels found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Image ID</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Lip Tone</TableHead>
                  <TableHead>Labeled By</TableHead>
                  <TableHead>Labeled At</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLabels.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id}</TableCell>
                    <TableCell className="font-mono text-xs">{row.image_id}</TableCell>
                    <TableCell>
                      {row.image_url ? (
                        <a href={row.image_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">View</a>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{row.admin_lip_tone_category || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs">{row.labeled_by_email || row.labeled_by_user_id || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {row.labeled_at ? new Date(row.labeled_at).toLocaleString() : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleRelabel(row.image_id)}>
                        Relabel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {filteredLabels.length} of {adminLabels.length} labels
        </p>

        <h2 className="text-lg text-muted-foreground">Customer Submissions</h2>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by shade, variant, date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No submissions found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shade</TableHead>
                  <TableHead>Shade ID</TableHead>
                  <TableHead>Variant ID</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Is Labeled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{row.shade_label}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.shade_id}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.variant_id}
                    </TableCell>
                    <TableCell>
                      {row.image_url ? (
                        <a
                          href={row.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline text-sm"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.is_labeled ? "Yes" : "No"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {filtered.length} of {data.length} submissions
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
