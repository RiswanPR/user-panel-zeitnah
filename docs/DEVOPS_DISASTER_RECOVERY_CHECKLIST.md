# ZEITNAH LMS — PRODUCTION DEPLOYMENT & DISASTER RECOVERY CHECKLIST

> **Audience**: DevOps, Cloud Infrastructure Engineers, and Release Managers  
> **Status**: Mandatory Pre-Production Gate  
> **Target Environment**: Production (MongoDB Atlas, AWS S3, Cloudflare/Reverse Proxy, Node.js Runtime)

---

## 1. Database Backup & Disaster Recovery (MongoDB Atlas)

- [ ] **MongoDB Automated Continuous Backups**: Verify that automated daily and continuous snapshotting is enabled in MongoDB Atlas for the production cluster.
- [ ] **Point-in-Time Recovery (PITR)**: Verify PITR is activated with a minimum 7-day retention window to allow restoration to any second in the event of logical corruption or accidental data deletion.
- [ ] **Pre-Migration Snapshot**: A dedicated manual snapshot must be triggered and verified **prior** to executing `npm run migrate:usernames -- --live` or running any index creation/dropping scripts.
- [ ] **Cold Restore Drill**: Document and execute an out-of-place test restore to a staging cluster to verify snapshot integrity and measure Recovery Time Objective (RTO < 30 minutes).
- [ ] **Failover & High Availability**: Ensure cluster tier is at least M10+ multi-AZ replica set with automated secondary failover.

---

## 2. Object Storage Protection (AWS S3)

- [ ] **S3 Bucket Versioning**: Confirm versioning is enabled on all production S3 buckets (`zeitnah-course-media`, `zeitnah-user-uploads`, `zeitnah-protected-videos`).
- [ ] **Object Lock / MFA Delete**: Ensure MFA delete or Object Lock is enabled on root buckets to prevent accidental or malicious deletion of uploaded course videos.
- [ ] **Lifecycle Archival**: Confirm transition rules to S3 Glacier/Infrequent Access for old audit backups.
- [ ] **CORS & Access Control**: Confirm bucket ACLs block all public access; all asset retrieval must occur via backend pre-signed URLs or CloudFront signed URLs.

---

## 3. Disaster Recovery Credentials & Runbooks

- [ ] **Emergency Recovery Credentials**: Verify that emergency break-glass credentials for Atlas, AWS, and Resend are stored in a secure secret manager (e.g., AWS Secrets Manager, 1Password vault) and tested.
- [ ] **Database Restore Procedure**:
  1. Access MongoDB Atlas console -> Clusters -> Backup -> Restore.
  2. Select "Point in Time" or desired snapshot.
  3. Choose target cluster (verify NOT to overwrite production unless in a declared full disaster).
  4. Update `MONGO_URL` connection string in production orchestrator (ECS/Kubernetes/PM2) to point to the restored instance.
  5. Restart backend services.
- [ ] **Application Rollback Procedure**:
  1. Re-deploy prior stable container image / Git tag.
  2. If database schema was changed, execute corresponding downward migration script or restore pre-migration database snapshot.
  3. Purge edge CDN caches (Cloudflare / CloudFront) to prevent serving stale JavaScript/CSS bundles.

---

## 4. Pre-Release Verification Sign-off

| Item | Requirement | DevOps Owner | Verification Date | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Atlas Backups** | Daily automated snapshots + 7-day PITR | Infrastructure | | [ ] PASS |
| **S3 Versioning** | Enabled on media & course buckets | Cloud Ops | | [ ] PASS |
| **Recovery Keys** | Tested break-glass credentials | Lead SecOps | | [ ] PASS |
| **Restore Runbook**| Documented and dry-run validated | Platform Team | | [ ] PASS |
| **Migration Guard**| Full snapshot before live index changes | DBA / Release Eng| | [ ] PASS |
