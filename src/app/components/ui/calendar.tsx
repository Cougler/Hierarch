import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/app/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col gap-4',
        month: 'flex flex-col gap-4',
        month_caption: 'relative flex items-center justify-center py-1',
        caption_label: 'text-sm font-medium text-foreground',
        nav: 'absolute inset-x-0 flex items-center justify-between pointer-events-none',
        button_previous: 'pointer-events-auto h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
        button_next: 'pointer-events-auto h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-8 text-center text-[0.75rem] font-medium text-muted-foreground/60 pb-1',
        weeks: '',
        week: 'flex w-full',
        day: 'p-0',
        day_button: cn(
          'h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-normal transition-colors',
          'text-foreground hover:bg-accent',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/50',
          'data-[selected]:bg-[#bf7535] data-[selected]:text-white data-[selected]:hover:bg-[#bf7535]/90',
          'data-[today]:bg-surface data-[today]:font-semibold',
          'data-[outside]:text-muted-foreground/30 data-[outside]:hover:bg-transparent',
          'data-[disabled]:text-muted-foreground/20 data-[disabled]:pointer-events-none',
        ),
        selected: '',
        today: '',
        outside: '',
        disabled: '',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }: { orientation?: string }) =>
          orientation === 'left'
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
