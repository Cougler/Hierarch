'use client';

import { useIsMobile } from '@/app/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/app/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/app/components/ui/drawer';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { ResourceEditor } from '@/app/components/ResourceEditor';
import type { Resource, Project } from '@/app/types';

interface DocumentResourceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: Resource;
  projects: Project[];
  onSave: (resource: Partial<Resource>) => void;
}

export function DocumentResourceDrawer({
  open,
  onOpenChange,
  resource,
  projects,
  onSave,
}: DocumentResourceDrawerProps) {
  const isMobile = useIsMobile();
  const title = resource ? 'Edit Resource' : 'New Resource';

  const handleSave = (data: Partial<Resource>) => {
    onSave(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>
              {resource ? 'Update this resource' : 'Create a new resource'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
            <ResourceEditor
              resource={resource}
              projects={projects}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {resource ? 'Update this resource' : 'Create a new resource'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(100vh-8rem)]">
          <div className="pr-4">
            <ResourceEditor
              resource={resource}
              projects={projects}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
