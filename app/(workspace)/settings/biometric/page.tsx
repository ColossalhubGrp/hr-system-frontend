import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  ChevronLeft,
  Cpu,
  Download,
  ExternalLink,
  Fingerprint,
  KeyRound,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { publicEnv } from "@/lib/env";

export const metadata = { title: "Biometric devices · Configuration · Colossal HR" };

export default async function BiometricSetupPage() {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/settings/biometric"),
    );
  }

  const apiHost = new URL(publicEnv.NEXT_PUBLIC_FRAPPE_URL).host;
  const pushEndpoint = `${publicEnv.NEXT_PUBLIC_FRAPPE_URL.replace(/\/$/, "")}/api/method/hrms.hr.doctype.employee_checkin.employee_checkin.add_log_based_on_employee_field`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={"/settings" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Configuration
      </Link>

      <PageHeader
        icon={Fingerprint}
        crumb="Configuration · HR policy · Biometric devices"
        title="Biometric devices"
        subtitle="Connect on-site fingerprint / face / RFID readers so punches flow into Attendance automatically. Colossal HR uses the standard Frappe HR ingestion endpoint — one Python sync tool runs on-site and posts logs here."
      />

      <Step
        n={1}
        icon={<BadgeCheck className="h-4 w-4" />}
        title="Set the device ID on every employee"
      >
        <p className="text-sm text-ash-700">
          On each employee&apos;s profile go to <strong>Attendance → Biometric device ID</strong>{" "}
          and enter the number the device uses for that person. Without this
          the sync tool has no way to match a punch to an Employee.
        </p>
        <Link
          href={"/employee" as Route}
          className="mt-2 inline-flex h-8 items-center gap-1 rounded-chip border border-hairline px-3 text-xs font-medium text-ash-700 hover:border-ink-400 hover:text-ink-800 focus-ring"
        >
          Open the directory
        </Link>
      </Step>

      <Step
        n={2}
        icon={<Cpu className="h-4 w-4" />}
        title="Install biometric-attendance-sync-tool on the machine next to the reader"
      >
        <p className="text-sm text-ash-700">
          The Frappe team ships a small Python daemon that pulls logs from
          ZKTeco / Essl devices over TCP/IP and forwards them to Colossal HR.
          Any Linux, macOS or Windows machine on the same LAN as the device
          works — a Raspberry Pi is enough.
        </p>
        <a
          href="https://github.com/frappe/biometric-attendance-sync-tool"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex h-8 items-center gap-1 rounded-chip border border-hairline px-3 text-xs font-medium text-ash-700 hover:border-ink-400 hover:text-ink-800 focus-ring"
        >
          <Download className="h-3 w-3" />
          github.com/frappe/biometric-attendance-sync-tool
          <ExternalLink className="h-3 w-3" />
        </a>
      </Step>

      <Step
        n={3}
        icon={<KeyRound className="h-4 w-4" />}
        title="Generate an API key for the sync tool"
      >
        <p className="text-sm text-ash-700">
          The tool authenticates as a Colossal HR user with the{" "}
          <strong>HR User</strong> role. Create a dedicated service user (for
          example <code className="font-mono text-xs">biometric-sync@your-company.com</code>),
          open its profile in Frappe Desk, and generate an API Key + API
          Secret. The sync tool&apos;s <code className="font-mono text-xs">local_config.py</code>{" "}
          needs both.
        </p>
        <p className="mt-2 text-xs text-ash-500">
          Keep the API Secret out of source control — the sync tool reads
          it from its own config file, never from the device.
        </p>
      </Step>

      <Step
        n={4}
        icon={<Fingerprint className="h-4 w-4" />}
        title="Point the sync tool at Colossal HR"
      >
        <p className="text-sm text-ash-700">
          In the sync tool&apos;s <code className="font-mono text-xs">local_config.py</code>,
          set:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-card border border-hairline bg-canvas/60 p-3 text-[12px] leading-relaxed">
          <code className="font-mono">{`ERPNEXT_URL = "https://${apiHost}"
ERPNEXT_API_KEY = "<paste your API key>"
ERPNEXT_API_SECRET = "<paste your API secret>"
PUSH_FREQUENCY = 60   # seconds between polls
ALLOWED_EXCEPTIONS = 3
IMPORT_START_DATE = "2026-01-01"
devices = [
    {
        "device_id": "office-main",
        "ip": "192.168.1.201",
        "punch_direction": "AUTO",
    }
]`}</code>
        </pre>
        <p className="mt-2 text-xs text-ash-500">
          Each log the tool reads gets POSTed to <code className="font-mono">{pushEndpoint}</code>,
          matched to your employees by their Biometric device ID. Auto
          Attendance then rolls the punches into daily Attendance rows
          on the shift you assigned each employee.
        </p>
      </Step>

      <Step
        n={5}
        icon={<BadgeCheck className="h-4 w-4" />}
        title="Verify the loop"
      >
        <p className="text-sm text-ash-700">
          Punch on the device, wait for the sync tool&apos;s next tick, then
          open{" "}
          <Link
            href={"/hr/attendance?tab=checkins" as Route}
            className="underline hover:text-ink-800"
          >
            Attendance → Check-ins
          </Link>{" "}
          — the new log appears with the device ID beside it. Within the
          hour, Auto Attendance rolls it into an <code className="font-mono text-xs">Attendance</code>{" "}
          record on the shift&apos;s end time. The Late Entry / Early Exit
          flags come from the grace windows you set on the Shift Type.
        </p>
      </Step>

      <section className="rounded-card border border-hairline bg-canvas/40 p-5 text-xs text-ash-600">
        <p>
          <strong className="text-ink-800">No device on hand?</strong> You
          can still simulate a punch by POSTing to the same endpoint from
          <code className="font-mono"> curl</code> — useful for testing the
          Auto Attendance rules on a Shift Type before hardware arrives.
        </p>
      </section>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card flex gap-4 p-5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-800 text-sm font-semibold text-white">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          {icon}
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
