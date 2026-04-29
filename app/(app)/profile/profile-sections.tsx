"use client"

import { useState, useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
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
import { cn } from "@/lib/utils"
import { Pencil, X, User, Utensils, ChefHat, Heart } from "lucide-react"

type SectionKey = "about" | "food" | "kitchen" | "health"

export function ProfileSections({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState<SectionKey | null>(null)
  const [state, action] = useActionState<ActionState, FormData>(updateProfile, null)

  useEffect(() => {
    if (state && "ok" in state) {
      if (state.ok) {
        toast.success("Profile updated")
        setEditing(null) // Close the section on success
      } else {
        toast.error(state.error)
      }
    }
  }, [state])

  return (
    <div className="flex flex-col gap-4">
      {/* About You Section */}
      <SectionCard
        title="About you"
        description="Body metrics used to calculate your targets."
        icon={<User className="size-4" />}
        isEditing={editing === "about"}
        onEdit={() => setEditing(editing === "about" ? null : "about")}
        viewContent={
          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoItem label="Name" value={profile.full_name ?? "—"} />
            <InfoItem label="Age" value={profile.age ? `${profile.age} years` : "—"} />
            <InfoItem label="Sex" value={formatSex(profile.sex)} />
            <InfoItem label="Height" value={profile.height_cm ? `${profile.height_cm} cm` : "—"} />
            <InfoItem label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : "—"} />
            <InfoItem label="Activity" value={formatActivity(profile.activity_level)} />
            <InfoItem label="Goal" value={formatGoal(profile.goal)} />
          </div>
        }
        editContent={
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="timezone" value={profile.timezone} />
            <input type="hidden" name="dietary_preferences" value={JSON.stringify(profile.dietary_preferences ?? [])} />
            <input type="hidden" name="cuisines" value={JSON.stringify(profile.cuisines ?? [])} />
            <input type="hidden" name="favorite_ingredients" value={JSON.stringify(profile.favorite_ingredients ?? [])} />
            <input type="hidden" name="disliked_ingredients" value={JSON.stringify(profile.disliked_ingredients ?? [])} />
            <input type="hidden" name="kitchen_appliances" value={JSON.stringify(profile.kitchen_appliances ?? [])} />
            <input type="hidden" name="allergies" value={JSON.stringify(profile.allergies ?? [])} />
            <input type="hidden" name="health_conditions" value={JSON.stringify(profile.health_conditions ?? [])} />
            <input type="hidden" name="cooking_skill" value={profile.cooking_skill ?? "intermediate"} />
            <input type="hidden" name="household_size" value={profile.household_size ?? 1} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="full_name">Full name</FieldLabel>
                <Input id="full_name" name="full_name" required defaultValue={profile.full_name ?? ""} className="bg-cream2/50 border-cream3 focus:border-sage" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="age">Age</FieldLabel>
                  <Input id="age" name="age" type="number" min={13} max={120} required defaultValue={profile.age ?? ""} className="bg-cream2/50 border-cream3 focus:border-sage" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="sex">Sex</FieldLabel>
                  <Select name="sex" defaultValue={profile.sex ?? "prefer_not_say"}>
                    <SelectTrigger id="sex" className="bg-cream2/50 border-cream3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="height_cm">Height (cm)</FieldLabel>
                  <Input id="height_cm" name="height_cm" type="number" step="0.1" required defaultValue={profile.height_cm ?? ""} className="bg-cream2/50 border-cream3 focus:border-sage" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="weight_kg">Weight (kg)</FieldLabel>
                  <Input id="weight_kg" name="weight_kg" type="number" step="0.1" required defaultValue={profile.weight_kg ?? ""} className="bg-cream2/50 border-cream3 focus:border-sage" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="activity_level">Activity level</FieldLabel>
                  <Select name="activity_level" defaultValue={profile.activity_level ?? "moderate"}>
                    <SelectTrigger id="activity_level" className="bg-cream2/50 border-cream3"><SelectValue /></SelectTrigger>
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
                    <SelectTrigger id="goal" className="bg-cream2/50 border-cream3"><SelectValue /></SelectTrigger>
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
            <SectionFormFooter onCancel={() => setEditing(null)} />
          </form>
        }
      />

      {/* Food Preferences Section */}
      <SectionCard
        title="Food preferences"
        description="NutriAI uses these to suggest recipes you'll enjoy."
        icon={<Utensils className="size-4" />}
        isEditing={editing === "food"}
        onEdit={() => setEditing(editing === "food" ? null : "food")}
        viewContent={
          <div className="space-y-3">
            {profile.dietary_preferences?.length ? <TagRow label="Diet style" tags={profile.dietary_preferences} variant="green" /> : null}
            {profile.cuisines?.length ? <TagRow label="Cuisines" tags={profile.cuisines} variant="amber" /> : null}
            {profile.favorite_ingredients?.length ? <TagRow label="Favorites" tags={profile.favorite_ingredients} variant="green" /> : null}
            {profile.disliked_ingredients?.length ? <TagRow label="Dislikes" tags={profile.disliked_ingredients} variant="gray" /> : null}
            {!profile.dietary_preferences?.length && !profile.cuisines?.length && (
              <p className="text-sm text-stone">No preferences set yet.</p>
            )}
          </div>
        }
        editContent={
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="timezone" value={profile.timezone} />
            <input type="hidden" name="full_name" value={profile.full_name ?? ""} />
            <input type="hidden" name="age" value={profile.age ?? ""} />
            <input type="hidden" name="sex" value={profile.sex ?? "prefer_not_say"} />
            <input type="hidden" name="height_cm" value={profile.height_cm ?? ""} />
            <input type="hidden" name="weight_kg" value={profile.weight_kg ?? ""} />
            <input type="hidden" name="activity_level" value={profile.activity_level ?? "moderate"} />
            <input type="hidden" name="goal" value={profile.goal ?? "maintain"} />
            <input type="hidden" name="kitchen_appliances" value={JSON.stringify(profile.kitchen_appliances ?? [])} />
            <input type="hidden" name="allergies" value={JSON.stringify(profile.allergies ?? [])} />
            <input type="hidden" name="health_conditions" value={JSON.stringify(profile.health_conditions ?? [])} />
            <input type="hidden" name="cooking_skill" value={profile.cooking_skill ?? "intermediate"} />
            <input type="hidden" name="household_size" value={profile.household_size ?? 1} />
            <FieldGroup>
              <FieldSet>
                <FieldLegend>Dietary style</FieldLegend>
                <ChipInput name="dietary_preferences" defaultValue={profile.dietary_preferences} suggestions={[...DIETARY_PREFERENCES]} placeholder="Add a preference…" />
              </FieldSet>
              <FieldSet>
                <FieldLegend>Preferred cuisines</FieldLegend>
                <ChipInput name="cuisines" defaultValue={profile.cuisines} suggestions={[...CUISINES]} placeholder="Add a cuisine…" />
              </FieldSet>
              <FieldSet>
                <FieldLegend>Favorite ingredients</FieldLegend>
                <ChipInput name="favorite_ingredients" defaultValue={profile.favorite_ingredients} placeholder="e.g. paneer, avocado…" />
              </FieldSet>
              <FieldSet>
                <FieldLegend>Ingredients to avoid</FieldLegend>
                <ChipInput name="disliked_ingredients" defaultValue={profile.disliked_ingredients} placeholder="e.g. mushrooms…" />
              </FieldSet>
            </FieldGroup>
            <SectionFormFooter onCancel={() => setEditing(null)} />
          </form>
        }
      />

      {/* Kitchen Section */}
      <SectionCard
        title="Your kitchen"
        description="We only suggest recipes you can actually cook."
        icon={<ChefHat className="size-4" />}
        isEditing={editing === "kitchen"}
        onEdit={() => setEditing(editing === "kitchen" ? null : "kitchen")}
        viewContent={
          <div className="space-y-3">
            <InfoItem label="Cooking skill" value={formatSkill(profile.cooking_skill)} />
            <InfoItem label="Household size" value={profile.household_size ? `${profile.household_size} people` : "—"} />
            {profile.kitchen_appliances?.length ? <TagRow label="Appliances" tags={profile.kitchen_appliances} variant="blue" /> : null}
          </div>
        }
        editContent={
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="timezone" value={profile.timezone} />
            <input type="hidden" name="full_name" value={profile.full_name ?? ""} />
            <input type="hidden" name="age" value={profile.age ?? ""} />
            <input type="hidden" name="sex" value={profile.sex ?? "prefer_not_say"} />
            <input type="hidden" name="height_cm" value={profile.height_cm ?? ""} />
            <input type="hidden" name="weight_kg" value={profile.weight_kg ?? ""} />
            <input type="hidden" name="activity_level" value={profile.activity_level ?? "moderate"} />
            <input type="hidden" name="goal" value={profile.goal ?? "maintain"} />
            <input type="hidden" name="dietary_preferences" value={JSON.stringify(profile.dietary_preferences ?? [])} />
            <input type="hidden" name="cuisines" value={JSON.stringify(profile.cuisines ?? [])} />
            <input type="hidden" name="favorite_ingredients" value={JSON.stringify(profile.favorite_ingredients ?? [])} />
            <input type="hidden" name="disliked_ingredients" value={JSON.stringify(profile.disliked_ingredients ?? [])} />
            <input type="hidden" name="allergies" value={JSON.stringify(profile.allergies ?? [])} />
            <input type="hidden" name="health_conditions" value={JSON.stringify(profile.health_conditions ?? [])} />
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="cooking_skill">Cooking skill</FieldLabel>
                  <Select name="cooking_skill" defaultValue={profile.cooking_skill ?? "intermediate"}>
                    <SelectTrigger id="cooking_skill" className="bg-cream2/50 border-cream3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="household_size">Household size</FieldLabel>
                  <Input id="household_size" name="household_size" type="number" min={1} max={20} defaultValue={profile.household_size ?? 1} className="bg-cream2/50 border-cream3 focus:border-sage" />
                  <FieldDescription>People you typically cook for.</FieldDescription>
                </Field>
              </div>
              <FieldSet>
                <FieldLegend>Appliances</FieldLegend>
                <ChipInput name="kitchen_appliances" defaultValue={profile.kitchen_appliances} suggestions={[...KITCHEN_APPLIANCES]} placeholder="Add an appliance…" />
              </FieldSet>
            </FieldGroup>
            <SectionFormFooter onCancel={() => setEditing(null)} />
          </form>
        }
      />

      {/* Health Section */}
      <SectionCard
        title="Health"
        description="Optional — helps us tailor suggestions safely."
        icon={<Heart className="size-4" />}
        isEditing={editing === "health"}
        onEdit={() => setEditing(editing === "health" ? null : "health")}
        viewContent={
          <div className="space-y-3">
            {profile.allergies?.length ? <TagRow label="Allergies" tags={profile.allergies} variant="red" /> : null}
            {profile.health_conditions?.length ? <TagRow label="Conditions" tags={profile.health_conditions} variant="amber" /> : null}
            {!profile.allergies?.length && !profile.health_conditions?.length && (
              <p className="text-sm text-stone">No health info set.</p>
            )}
          </div>
        }
        editContent={
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="timezone" value={profile.timezone} />
            <input type="hidden" name="full_name" value={profile.full_name ?? ""} />
            <input type="hidden" name="age" value={profile.age ?? ""} />
            <input type="hidden" name="sex" value={profile.sex ?? "prefer_not_say"} />
            <input type="hidden" name="height_cm" value={profile.height_cm ?? ""} />
            <input type="hidden" name="weight_kg" value={profile.weight_kg ?? ""} />
            <input type="hidden" name="activity_level" value={profile.activity_level ?? "moderate"} />
            <input type="hidden" name="goal" value={profile.goal ?? "maintain"} />
            <input type="hidden" name="dietary_preferences" value={JSON.stringify(profile.dietary_preferences ?? [])} />
            <input type="hidden" name="cuisines" value={JSON.stringify(profile.cuisines ?? [])} />
            <input type="hidden" name="favorite_ingredients" value={JSON.stringify(profile.favorite_ingredients ?? [])} />
            <input type="hidden" name="disliked_ingredients" value={JSON.stringify(profile.disliked_ingredients ?? [])} />
            <input type="hidden" name="kitchen_appliances" value={JSON.stringify(profile.kitchen_appliances ?? [])} />
            <input type="hidden" name="cooking_skill" value={profile.cooking_skill ?? "intermediate"} />
            <input type="hidden" name="household_size" value={profile.household_size ?? 1} />
            <FieldGroup>
              <FieldSet>
                <FieldLegend>Allergies</FieldLegend>
                <ChipInput name="allergies" defaultValue={profile.allergies} suggestions={[...COMMON_ALLERGIES]} placeholder="Add an allergy…" />
              </FieldSet>
              <FieldSet>
                <FieldLegend>Health conditions</FieldLegend>
                <ChipInput name="health_conditions" defaultValue={profile.health_conditions} suggestions={[...COMMON_HEALTH]} placeholder="Add a condition…" />
              </FieldSet>
            </FieldGroup>
            <SectionFormFooter onCancel={() => setEditing(null)} />
          </form>
        }
      />
    </div>
  )
}

/* ── Section Card Shell ── */
function SectionCard({
  title,
  description,
  icon,
  isEditing,
  onEdit,
  viewContent,
  editContent,
}: {
  title: string
  description: string
  icon: React.ReactNode
  isEditing: boolean
  onEdit: () => void
  viewContent: React.ReactNode
  editContent: React.ReactNode
}) {
  return (
    <div className={cn(
      "bg-card rounded-2xl border p-5 animate-fade-in-up transition-all duration-200",
      isEditing ? "border-sage/40 shadow-sm ring-1 ring-sage/10" : "border-border"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sage">{icon}</span>
          <div>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <p className="text-[11px] text-stone">{description}</p>
          </div>
        </div>
        <Button
          variant={isEditing ? "outline" : "ghost"}
          size="sm"
          onClick={onEdit}
          className={cn(
            "gap-1.5 text-xs h-8",
            isEditing ? "border-sage/30 text-sage" : "text-stone hover:text-sage"
          )}
        >
          {isEditing ? <><X className="size-3" /> Cancel</> : <><Pencil className="size-3" /> Edit</>}
        </Button>
      </div>
      {isEditing ? editContent : viewContent}
    </div>
  )
}

/* ── Section Form Footer ── */
function SectionFormFooter({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus()
  return (
    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
      <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" size="sm" disabled={pending} className="bg-forest hover:bg-sage text-white">
        {pending ? <><Spinner className="size-4 mr-1" /> Saving…</> : "Save changes"}
      </Button>
    </div>
  )
}

/* ── View helpers ── */
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-fog">{label}</span>
      <span className="text-sm font-medium text-ink capitalize">{value}</span>
    </div>
  )
}

function TagRow({ label, tags, variant }: { label: string; tags: string[]; variant: "green" | "amber" | "red" | "gray" | "blue" }) {
  const styles = {
    green: "bg-mint2 text-sage",
    amber: "bg-turmeric-l text-turmeric",
    red: "bg-clay-l text-clay",
    gray: "bg-cream3 text-stone",
    blue: "bg-blue-50 text-blue-600",
  }
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-fog mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className={cn("px-2.5 py-1 rounded-full text-xs font-medium capitalize", styles[variant])}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

function formatSex(sex: string | null | undefined): string {
  if (!sex || sex === "prefer_not_say") return "—"
  return sex.charAt(0).toUpperCase() + sex.slice(1)
}

function formatActivity(level: string | null | undefined): string {
  const labels: Record<string, string> = {
    sedentary: "Sedentary", light: "Light", moderate: "Moderate",
    active: "Active", very_active: "Very Active",
  }
  return level ? labels[level] ?? level : "—"
}

function formatGoal(goal: string | null | undefined): string {
  const labels: Record<string, string> = {
    lose: "Lose fat", maintain: "Maintain", gain: "Gain muscle", recomp: "Recomp",
  }
  return goal ? labels[goal] ?? goal : "—"
}

function formatSkill(skill: string | null | undefined): string {
  if (!skill) return "—"
  return skill.charAt(0).toUpperCase() + skill.slice(1)
}
