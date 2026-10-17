import { CheckCircle2, Award, FolderGit2, ShieldCheck } from "lucide-react";

export default function SkillProofBadge({ skill }) {
  const isDemonstrated = skill.isDemonstrated || (skill.proofs && skill.proofs.length > 0);
  const proofs = skill.proofs || [];

  const firstProof = proofs[0];
  let proofLabel = "Demonstrated";
  let ProofIcon = CheckCircle2;

  if (firstProof) {
    if (firstProof.sourceType === "COURSE_COMPLETION") {
      proofLabel = "Course Verified";
      ProofIcon = Award;
    } else if (firstProof.sourceType === "PROJECT") {
      proofLabel = "Project Proven";
      ProofIcon = FolderGit2;
    } else if (firstProof.sourceType === "CERTIFICATE") {
      proofLabel = "Certified";
      ProofIcon = ShieldCheck;
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card border border-border hover:border-border-accent transition-colors">
      <span className="text-xs font-medium text-text-primary">{skill.name}</span>
      {isDemonstrated ? (
        <span
          title={proofLabel}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-1.5 py-0.5 rounded"
        >
          <ProofIcon className="h-2.5 w-2.5" />
          <span>{proofLabel}</span>
        </span>
      ) : (
        <span className="text-[10px] text-text-muted bg-surface-elevated px-1.5 py-0.5 rounded">
          Claimed
        </span>
      )}
    </div>
  );
}
