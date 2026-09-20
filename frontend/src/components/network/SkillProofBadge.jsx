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
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-white/5 hover:border-white/10 transition-colors">
      <span className="text-xs font-medium text-white">{skill.name}</span>
      {isDemonstrated ? (
        <span
          title={proofLabel}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-mint bg-mint/10 border border-mint/20 px-1.5 py-0.5 rounded"
        >
          <ProofIcon className="h-2.5 w-2.5" />
          <span>{proofLabel}</span>
        </span>
      ) : (
        <span className="text-[10px] text-text-muted bg-white/5 px-1.5 py-0.5 rounded">
          Claimed
        </span>
      )}
    </div>
  );
}
