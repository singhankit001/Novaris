import type { ReportFalsePositiveReason } from "@prisma/client";
import type { Status } from "@/components/nv/badge";
import type { SecurityFinding } from "@/lib/security-scanner";

export type Severity = SecurityFinding["severity"];

export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];

export const severityStatus: Record<Severity, Status> = {
    critical: "danger",
    high: "danger",
    medium: "warning",
    low: "info",
    info: "neutral",
};

export const severityLabel: Record<Severity, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
    info: "Info",
};

type Verification = NonNullable<SecurityFinding["verificationStatus"]>;

export const verificationLabel: Record<Verification, string> = {
    AUTO_VERIFIED_TRUE: "Verified by automated checks",
    OPEN: "Open",
    CLOSED: "Closed",
    AUTO_REJECTED_FALSE: "Rejected by automated checks",
    INCONCLUSIVE_HIDDEN: "Verification inconclusive",
    DETECTED: "Detected, not verified",
};

/** Verified findings passed the scanner's verification gate; everything else is rule or model output. */
export function findingBasis(finding: SecurityFinding): "measured" | "inferred" {
    return finding.verificationStatus === "AUTO_VERIFIED_TRUE" ? "measured" : "inferred";
}

export function verificationText(finding: SecurityFinding): string {
    return finding.verificationStatus ? verificationLabel[finding.verificationStatus] : "Not verified (scan has no verification data)";
}

export const confidenceLabel = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" } as const;

export const falsePositiveReasonOptions: Array<{ value: ReportFalsePositiveReason; label: string; description: string }> = [
    { value: "NOT_A_VULNERABILITY", label: "Not a vulnerability", description: "The finding is technically incorrect for this code path." },
    { value: "TEST_OR_FIXTURE", label: "Test or fixture only", description: "The finding points to non-production code or seeded test data." },
    { value: "FALSE_DATAFLOW", label: "False dataflow", description: "The scanner connected source and sink incorrectly." },
    { value: "INTENDED_BEHAVIOR", label: "Intended behavior", description: "The flagged pattern is deliberate and already protected by surrounding controls." },
    { value: "OTHER", label: "Other", description: "Use this when none of the standard categories fit." },
];
