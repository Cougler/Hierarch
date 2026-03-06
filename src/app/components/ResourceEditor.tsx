'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Plus, Trash2, X } from 'lucide-react';
import type { Resource, ResourceType, Project } from '@/app/types';
import { RichTextEditor } from '@/app/components/RichTextEditor';

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ResourceEditorProps {
  resource?: Resource;
  projects: Project[];
  onSave: (resource: Partial<Resource>) => void;
  onCancel: () => void;
}

const RESOURCE_TYPES: ResourceType[] = [
  'Project Note',
  'Meeting Note',
  'Research',
  'Link',
];

export function ResourceEditor({
  resource,
  projects,
  onSave,
  onCancel,
}: ResourceEditorProps) {
  const [title, setTitle] = useState(resource?.title || '');
  const [type, setType] = useState<ResourceType>(resource?.type || 'Project Note');
  const [content, setContent] = useState(resource?.content || '');
  const [url, setUrl] = useState(resource?.url || '');
  const [projectId, setProjectId] = useState(resource?.projectId || '');
  const [pinned, setPinned] = useState(resource?.pinned || false);
  const [actionItems, setActionItems] = useState<ActionItem[]>(() => {
    const items = resource?.metadata?.actionItems;
    return Array.isArray(items) ? (items as ActionItem[]) : [];
  });
  const [newActionItem, setNewActionItem] = useState('');

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setType(resource.type);
      setContent(resource.content || '');
      setUrl(resource.url || '');
      setProjectId(resource.projectId || '');
      setPinned(resource.pinned || false);
      const items = resource.metadata?.actionItems;
      setActionItems(Array.isArray(items) ? (items as ActionItem[]) : []);
    }
  }, [resource]);

  const handleAddActionItem = useCallback(() => {
    if (!newActionItem.trim()) return;
    setActionItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: newActionItem.trim(), completed: false },
    ]);
    setNewActionItem('');
  }, [newActionItem]);

  const toggleActionItem = useCallback((id: string) => {
    setActionItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  }, []);

  const deleteActionItem = useCallback((id: string) => {
    setActionItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    const data: Partial<Resource> = {
      title: title.trim() || 'Untitled',
      type,
      pinned,
      projectId: projectId || undefined,
    };

    if (type === 'Link') {
      data.url = url;
    } else {
      data.content = content;
    }

    if (type === 'Meeting Note') {
      data.metadata = {
        ...resource?.metadata,
        actionItems,
      };
    }

    if (resource?.id) {
      data.id = resource.id;
    }

    onSave(data);
  }, [title, type, content, url, projectId, pinned, actionItems, resource, onSave]);

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <Label htmlFor="resource-title">Title</Label>
        <Input
          id="resource-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resource title"
        />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {type === 'Link' ? (
        <div className="space-y-2">
          <Label htmlFor="resource-url">URL</Label>
          <Input
            id="resource-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            type="url"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Content</Label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Write your notes..."
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Project (optional)</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="No project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No project</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="resource-pinned">Pinned</Label>
        <Switch
          id="resource-pinned"
          checked={pinned}
          onCheckedChange={setPinned}
        />
      </div>

      {type === 'Meeting Note' && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label>Action Items</Label>
            <div className="space-y-2">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2"
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => toggleActionItem(item.id)}
                  />
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      item.completed && 'text-muted-foreground line-through',
                    )}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteActionItem(item.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newActionItem}
                onChange={(e) => setNewActionItem(e.target.value)}
                placeholder="Add action item..."
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddActionItem();
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                onClick={handleAddActionItem}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Separator />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}
