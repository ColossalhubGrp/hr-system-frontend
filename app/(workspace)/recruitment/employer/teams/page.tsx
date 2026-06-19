"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import { Plus, Save, Users } from "lucide-react"
import type { EmployerTeam } from "@/lib/recruitment/types"

export default function EmployerTeamsPage() {
    const router = useRouter()
    const userEmail = useMemo(() => getStoredUserEmail(), [])
    const [loading, setLoading] = useState(true)
    const [teams, setTeams] = useState<EmployerTeam[]>([])
    const [saving, setSaving] = useState(false)
    const [newTeam, setNewTeam] = useState({
        team_name: "",
        department: "",
        manager: "",
        positions: "",
    })

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }

        setNewTeam((prev) => ({ ...prev, manager: userEmail }))
        loadTeams()
    }, [router, userEmail])

    const loadTeams = async () => {
        if (!userEmail) {
            setLoading(false)
            return
        }

        try {
            const response = await apiClient.getEmployerTeams(userEmail)
            setTeams(response.teams || [])
        } catch (error: any) {
            toast.error(error.message || "Failed to load teams")
        } finally {
            setLoading(false)
        }
    }

    const handleAddTeam = async () => {
        if (!userEmail) {
            toast.error("User email not found. Please login again.")
            return
        }

        if (!newTeam.team_name.trim()) {
            toast.error("Team name is required")
            return
        }

        setSaving(true)
        try {
            await apiClient.addEmployerTeam(
                userEmail,
                newTeam.team_name.trim(),
                newTeam.department.trim() || undefined,
                newTeam.manager.trim() || undefined,
                newTeam.positions.trim() || undefined,
            )
            toast.success("Team added")
            setNewTeam({ team_name: "", department: "", manager: userEmail, positions: "" })
            loadTeams()
        } catch (error: any) {
            toast.error(error.message || "Failed to add team")
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateTeam = async (team: EmployerTeam) => {
        try {
            await apiClient.updateEmployerTeam(team.name, {
                team_name: team.team_name,
                department: team.department,
                manager: team.manager,
                positions: team.positions,
            })
            toast.success("Team updated")
            loadTeams()
        } catch (error: any) {
            toast.error(error.message || "Failed to update team")
        }
    }

    const updateTeamState = (teamId: string, patch: Partial<EmployerTeam>) => {
        setTeams((prev) => prev.map((team) => (team.name === teamId ? { ...team, ...patch } : team)))
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="flex h-64 items-center justify-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#034078] border-t-transparent" />
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout>
            <div className="mx-auto w-full max-w-6xl space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1282A2]">
                            Organization
                        </p>
                        <h1 className="mt-1 text-[28px] font-bold leading-tight text-[#0A1128]">
                            Teams
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-[#525252]">
                            Create teams, assign managers, and group hiring needs by department.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#525252]">
                        <Users className="h-3.5 w-3.5" />
                        {teams.length} {teams.length === 1 ? "team" : "teams"}
                    </span>
                </div>

                {/* Add team */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                    <div className="flex items-center gap-2">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                New team
                            </p>
                            <p className="text-base font-semibold text-[#0A1128]">
                                Add a team to your account
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                Team name
                            </Label>
                            <Input
                                value={newTeam.team_name}
                                onChange={(e) =>
                                    setNewTeam((prev) => ({ ...prev, team_name: e.target.value }))
                                }
                                placeholder="Engineering"
                                className="border-[#E5E5E5] focus:border-[#034078]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                Department
                            </Label>
                            <Input
                                value={newTeam.department}
                                onChange={(e) =>
                                    setNewTeam((prev) => ({ ...prev, department: e.target.value }))
                                }
                                placeholder="Software"
                                className="border-[#E5E5E5] focus:border-[#034078]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                Manager
                            </Label>
                            <Input
                                value={newTeam.manager}
                                onChange={(e) =>
                                    setNewTeam((prev) => ({ ...prev, manager: e.target.value }))
                                }
                                placeholder="manager@example.com"
                                className="border-[#E5E5E5] focus:border-[#034078]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                Positions (comma-separated)
                            </Label>
                            <Input
                                value={newTeam.positions}
                                onChange={(e) =>
                                    setNewTeam((prev) => ({ ...prev, positions: e.target.value }))
                                }
                                placeholder="Backend Engineer, Frontend Engineer"
                                className="border-[#E5E5E5] focus:border-[#034078]"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleAddTeam}
                        disabled={saving}
                        className="mt-4 bg-[#034078] text-white hover:bg-[#0A1128]"
                    >
                        {saving ? "Adding…" : "Add team"}
                    </Button>
                </div>

                {/* Teams list */}
                {teams.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#E5E5E5] bg-white p-12 text-center">
                        <span
                            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-[#A3A3A3]"
                            style={{ background: "#F5F5F5" }}
                            aria-hidden="true"
                        >
                            <Users className="h-6 w-6" />
                        </span>
                        <p className="text-sm font-semibold text-[#0A1128]">No teams yet</p>
                        <p className="mt-1 text-xs text-[#525252]">
                            Create your first team using the form above.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {teams.map((team) => (
                            <div
                                key={team.name}
                                className="rounded-2xl border border-[#E5E5E5] bg-white p-5"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-base font-semibold text-[#0A1128]">
                                            {team.team_name || "Unnamed team"}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                            Team name
                                        </Label>
                                        <Input
                                            value={team.team_name || ""}
                                            onChange={(e) =>
                                                updateTeamState(team.name, { team_name: e.target.value })
                                            }
                                            className="border-[#E5E5E5] focus:border-[#034078]"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                            Department
                                        </Label>
                                        <Input
                                            value={team.department || ""}
                                            onChange={(e) =>
                                                updateTeamState(team.name, { department: e.target.value })
                                            }
                                            className="border-[#E5E5E5] focus:border-[#034078]"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                            Manager
                                        </Label>
                                        <Input
                                            value={team.manager || ""}
                                            onChange={(e) =>
                                                updateTeamState(team.name, { manager: e.target.value })
                                            }
                                            className="border-[#E5E5E5] focus:border-[#034078]"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                            Positions
                                        </Label>
                                        <Input
                                            value={team.positions || ""}
                                            onChange={(e) =>
                                                updateTeamState(team.name, { positions: e.target.value })
                                            }
                                            className="border-[#E5E5E5] focus:border-[#034078]"
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleUpdateTeam(team)}
                                        className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        Save changes
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    )
}
