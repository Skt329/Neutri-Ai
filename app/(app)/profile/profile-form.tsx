"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
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
import { updateProfile, type ActionState } from "./actions"
import type { Profile } from "@/lib/types"
import { toast } from "sonner"

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfile, null)

  useEffect(() => {
    if (state && "ok" in state) {
      if (state.ok) toast.success("Profile updated")
      else toast.error(state.error)
    }
  }, [state])

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="timezone" value={profile.timezone} />

      {/* ── About you ── */}
      <FieldGroup>
        <SectionHeader title="About you" description="Body metrics used to calculate your targets." />
        <Field>
          <FieldLabel htmlFor="full_name">Full name</FieldLabel>
          <Input id="full_name" name="full_name" required defaultValue={profile.full_name ?? ""} />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="age">Age</FieldLabel>
            <Input id="age" name="age" type="number" min={13} max={120} required defaultValue={profile.age ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="sex">Sex</FieldLabel>
            <Select name="sex" defaultValue={profile.sex ?? "prefer_not_say"}>
              <SelectTrigger id="sex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="height_cm">Height (cm)</FieldLabel>
            <Input
              id="height_cm"
              name="height_cm"
              type="number"
              step="0.1"
              required
              defaultValue={profile.height_cm ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="weight_kg">Weight (kg)</FieldLabel>
            <Input
              id="weight_kg"
              name="weight_kg"
              type="number"
              step="0.1"
              required
              defaultValue={profile.weight_kg ?? ""}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="activity_level">Activity level</FieldLabel>
            <Select name="activity_level" defaultValue={profile.activity_level ?? "moderate"}>
              <SelectTrigger id="activity_level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="very_active">Very active</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="goal">Goal</FieldLabel>
            <Select name="goal" defaultValue={profile.goal ?? "maintain"}>
              <SelectTrigger id="goal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lose">Lose fat</SelectItem>
                <SelectItem value="maintain">Maintain</SelectItem>
                <SelectItem value="gain">Gain muscle</SelectItem>
                <SelectItem value="recomp">Recomp</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FieldGroup>

      {/* ── Food preferences ── */}
      <FieldGroup>
        <SectionHeader
          title="Food preferences"
          description="NutriAI uses these to suggest recipes you'll enjoy."
        />

        <FieldSet>
          <FieldLegend>Dietary style</FieldLegend>
          <ChipInput
            name="dietary_preferences"
            defaultValue={profile.dietary_preferences}
            suggestions={[...DIETARY_PREFERENCES]}
            placeholder="Add a preference…"
          />
        </FieldSet>

        <FieldSet>
          <FieldLegend>Preferred cuisines</FieldLegend>
          <ChipInput
            name="cuisines"
            defaultValue={profile.cuisines}
            suggestions={[...CUISINES]}
            placeholder="Add a cuisine…"
          />
        </FieldSet>

        <FieldSet>
          <FieldLegend>Favorite ingredients</FieldLegend>
          <ChipInput
            name="favorite_ingredients"
            defaultValue={profile.favorite_ingredients}
            placeholder="e.g. paneer, avocado…"
          />
        </FieldSet>

        <FieldSet>
          <FieldLegend>Ingredients to avoid</FieldLegend>
          <ChipInput
            name="disliked_ingredients"
            defaultValue={profile.disliked_ingredients}
            placeholder="e.g. mushrooms…"
          />
        </FieldSet>
      </FieldGroup>

      {/* ── Kitchen ── */}
      <FieldGroup>
        <SectionHeader title="Your kitchen" description="We only suggest recipes you can actually cook." />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="cooking_skill">Cooking skill</FieldLabel>
            <Select name="cooking_skill" defaultValue={profile.cooking_skill ?? "intermediate"}>
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
              defaultValue={profile.household_size ?? 1}
            />
            <FieldDescription>People you typically cook for.</FieldDescription>
          </Field>
        </div>

        <FieldSet>
          <FieldLegend>Appliances</FieldLegend>
          <ChipInput
            name="kitchen_appliances"
            defaultValue={profile.kitchen_appliances}
            suggestions={[...KITCHEN_APPLIANCES]}
            placeholder="Add an appliance…"
          />
        </FieldSet>
      </FieldGroup>

      {/* ── Health ── */}
      <FieldGroup>
        <SectionHeader title="Health" description="Optional — helps us tailor suggestions safely." />
        <FieldSet>
          <FieldLegend>Allergies</FieldLegend>
          <ChipInput
            name="allergies"
            defaultValue={profile.allergies}
            suggestions={[...COMMON_ALLERGIES]}
            placeholder="Add an allergy…"
          />
        </FieldSet>
        <FieldSet>
          <FieldLegend>Health conditions</FieldLegend>
          <ChipInput
            name="health_conditions"
            defaultValue={profile.health_conditions}
            suggestions={[...COMMON_HEALTH]}
            placeholder="Add a condition…"
          />
        </FieldSet>
      </FieldGroup>

      <Submit />
    </form>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} size="lg">
      {pending ? (
        <>
          <Spinner className="size-4" /> Saving…
        </>
      ) : (
        "Save changes"
      )}
    </Button>
  )
}
