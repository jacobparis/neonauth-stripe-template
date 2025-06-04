'use client'
import { Moon, Sun, Laptop } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from './ui/label'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
          <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="dark:bg-card dark:border-border/50"
      >
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="cursor-pointer"
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="cursor-pointer"
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="cursor-pointer"
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ThemeSelect() {
  const { theme, setTheme } = useTheme()

  return (
    <RadioGroup
      defaultValue={theme}
      onValueChange={setTheme}
      className="flex gap-4"
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="light" id="light" />
        <Label htmlFor="light" className="flex items-center gap-1.5">
          <Sun className="h-4 w-4" />
          Light
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="dark" id="dark" />
        <Label htmlFor="dark" className="flex items-center gap-1.5">
          <Moon className="h-4 w-4" />
          Dark
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="system" id="system" />
        <Label htmlFor="system" className="flex items-center gap-1.5">
          <Laptop className="h-4 w-4" />
          System
        </Label>
      </div>
    </RadioGroup>
  )
}
