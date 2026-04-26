"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChipInput } from "@/components/chip-input"
import {
  KITCHEN_APPLIANCES,
  CUISINES,
  DIETARY_PREFERENCES,
  COMMON_ALLERGIES,
  COMMON_HEALTH,
} from "@/lib/preferences"
import { submitOnboarding, type OnboardingFormState } from "./actions"
import { toast } from "sonner"

const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sedentary (little to no exercise)" },
  { value: "light", label: "Light (1–3 days/week)" },
  { value: "moderate", label: "Moderate (3–5 days/week)" },
  { value: "active", label: "Active (6–7 days/week)" },
  { value: "very_active", label: "Very active (physical job or 2x/day)" },
]

const GOAL_OPTIONS = [
  { value: "lose", label: "Lose fat" },
  { value: "maintain", label: "Maintain weight" },
  { value: "gain", label: "Gain muscle" },
  { value: "recomp", label: "Body recomposition" },
]

export function OnboardingForm({ initialFullName }: { initialFullName: string }) {
  const [state, formAction] = useActionState<OnboardingFormState, FormData>(submitOnboarding, null)
  const [timezone, setTimezone] = useState("UTC")

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")
    } catch {
      setTimezone("UTC")
    }
  }, [])

  useEffect(() => {
    if (state && "ok" in state && state.ok === false) {
      toast.error(state.error)
    }
  }, [state])

  const errs = (state && "fieldErrors" in state && state.fieldErrors) || {}

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="timezone" value={timezone} />

      {/* ───── Step 1 · Basic info ───── */}
      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
          <CardDescription>Used to compute your personalized calorie + macro targets.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errs.full_name}>
              <FieldLabel htmlFor="full_name">Full name</FieldLabel>
              <Input id="full_name" name="full_name" required defaultValue={initialFullName} />
              {errs.full_name && <FieldError>{errs.full_name.join(", ")}</FieldError>}
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field data-invalid={!!errs.age}>
                <FieldLabel htmlFor="age">Age</FieldLabel>
                <Input id="age" name="age" type="number" min={13} max={120} required />
                {errs.age && <FieldError>{errs.age.join(", ")}</FieldError>}
              </Field>
              <Field data-invalid={!!errs.sex}>
                <FieldLabel htmlFor="sex">Sex</FieldLabel>
                <Select name="sex" defaultValue="prefer_not_say">
                  <SelectTrigger id="sex">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>Used only for metabolic calculations.</FieldDescription>
                {errs.sex && <FieldError>{errs.sex.join(", ")}</FieldError>}
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field data-invalid={!!errs.height_cm}>
                <FieldLabel htmlFor="height_cm">Height (cm)</FieldLabel>
                <Input id="height_cm" name="height_cm" type="number" min={80} max={260} step={0.1} required />
                {errs.height_cm && <FieldError>{errs.height_cm.join(", ")}</FieldError>}
              </Field>
              <Field data-invalid={!!errs.weight_kg}>
                <FieldLabel htmlFor="weight_kg">Weight (kg)</FieldLabel>
                <Input id="weight_kg" name="weight_kg" type="number" min={25} max={400} step={0.1} required />
                {errs.weight_kg && <FieldError>{errs.weight_kg.join(", ")}</FieldError>}
              </Field>
            </div>

            <Field data-invalid={!!errs.activity_level}>
              <FieldLabel htmlFor="activity_level">Activity level</FieldLabel>
              <Select name="activity_level" defaultValue="moderate">
                <SelectTrigger id="activity_level">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errs.activity_level && <FieldError>{errs.activity_level.join(", ")}</FieldError>}
            </Field>

            <Field data-invalid={!!errs.goal}>
              <FieldLabel htmlFor="goal">Primary goal</FieldLabel>
              <Select name="goal" defaultValue="maintain">
                <SelectTrigger id="goal">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errs.goal && <FieldError>{errs.goal.join(", ")}</FieldError>}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ───── Step 2 · Food preferences ───── */}
      <Card>
        <CardHeader>
          <CardTitle>Food preferences</CardTitle>
          <CardDescription>NutriAI uses these to suggest meals you&apos;ll actually enjoy.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Dietary style</FieldLegend>
              <FieldDescription>Tap any that apply. You can also type your own.</FieldDescription>
              <ChipInput
                name="dietary_preferences"
                suggestions={[...DIETARY_PREFERENCES]}
                placeholder="Add a preference…"
              />
            </FieldSet>

            <FieldSet>
              <FieldLegend>Cuisines you enjoy</FieldLegend>
              <ChipInput name="cuisines" suggestions={[...CUISINES]} placeholder="Add a cuisine…" />
            </FieldSet>

            <FieldSet>
              <FieldLegend>Favorite ingredients</FieldLegend>
              <FieldDescription>We&apos;ll bias suggestions toward these.</FieldDescription>
              <ChipInput name="favorite_ingredients" placeholder="e.g. paneer, chicken, avocado…" />
            </FieldSet>

            <FieldSet>
              <FieldLegend>Ingredients to avoid</FieldLegend>
              <FieldDescription>Hard avoids — NutriAI will skip these in suggestions.</FieldDescription>
              <ChipInput name="disliked_ingredients" placeholder="e.g. mushrooms, eggplant…" />
            </FieldSet>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ───── Step 3 · Kitchen & health ───── */}
      <Card>
        <CardHeader>
          <CardTitle>Kitchen & health</CardTitle>
          <CardDescription>So we only suggest recipes you can actually cook.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cooking_skill">Cooking skill</FieldLabel>
                <Select name="cooking_skill" defaultValue="intermediate">
                  <SelectTrigger id="cooking_skill">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="household_size">Household size</FieldLabel>
                <Input
                  id="household_size"
                  name="household_size"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={1}
                />
                <FieldDescription>How many people you typically cook for.</FieldDescription>
              </Field>
            </div>

            <FieldSet>
              <FieldLegend>Appliances available</FieldLegend>
              <ChipInput
                name="kitchen_appliances"
                suggestions={[...KITCHEN_APPLIANCES]}
                placeholder="Add an appliance…"
              />
            </FieldSet>

            <FieldSet>
              <FieldLegend>Allergies</FieldLegend>
              <ChipInput
                name="allergies"
                suggestions={[...COMMON_ALLERGIES]}
                placeholder="Add an allergy…"
              />
            </FieldSet>

            <FieldSet>
              <FieldLegend>Health conditions</FieldLegend>
              <FieldDescription>Only used for personalized guidance.</FieldDescription>
              <ChipInput
                name="health_conditions"
                suggestions={[...COMMON_HEALTH]}
                placeholder="Add a condition…"
              />
            </FieldSet>
          </FieldGroup>
        </CardContent>
      </Card>

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full">
      {pending ? (
        <>
          <Spinner className="size-4" /> Setting up your plan…
        </>
      ) : (
        "Create my plan"
      )}
    </Button>
  )
}
