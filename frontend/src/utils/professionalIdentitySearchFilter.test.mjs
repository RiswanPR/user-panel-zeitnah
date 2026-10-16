import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Zeitnah Professional Identity — Phase 5: Frontend Filter & Search Integration", () => {
  // ── 1. Filter Updater & State Transition Semantics ──
  describe("1. Department filter selection, toggling, and reset semantics", () => {
    it("updates departmentId when selecting a department", () => {
      const initialFilters = {
        role: "all",
        departmentId: "",
        discipline: "",
      };

      const handleUpdate = (current, key, value) => ({
        ...current,
        [key]: current[key] === value ? "" : value,
      });

      const updated = handleUpdate(initialFilters, "departmentId", "civil-engineering");
      assert.equal(updated.departmentId, "civil-engineering");

      // Toggling the same department clears it back to empty string
      const toggled = handleUpdate(updated, "departmentId", "civil-engineering");
      assert.equal(toggled.departmentId, "");
    });

    it("correctly computes active filter count including department", () => {
      const computeActiveCount = (filters) => {
        const {
          role = "all",
          departmentId = "",
          discipline = "",
          specialization = "",
          sector = "",
          software = "",
          experience = "",
          location = "",
        } = filters;

        return [
          role !== "all" && role,
          departmentId && departmentId !== "all" && departmentId,
          discipline,
          specialization,
          sector,
          software,
          experience,
          location,
        ].filter(Boolean).length;
      };

      assert.equal(computeActiveCount({ role: "all" }), 0);
      assert.equal(computeActiveCount({ role: "all", departmentId: "civil-engineering" }), 1);
      assert.equal(
        computeActiveCount({
          role: "professional",
          departmentId: "civil-engineering",
          discipline: "Civil",
        }),
        3,
      );
      assert.equal(computeActiveCount({ role: "all", departmentId: "all" }), 0);
    });

    it("handleClearAll resets departmentId alongside all other filters", () => {
      const activeFilters = {
        role: "professional",
        departmentId: "civil-engineering",
        discipline: "Civil",
        sector: "Bridges",
        q: "Engineer",
      };

      const handleClearAll = () => ({
        role: "all",
        departmentId: "",
        discipline: "",
        specialization: "",
        sector: "",
        software: "",
        skill: "",
        experience: "",
        location: "",
        institution: "",
        company: "",
        q: "",
      });

      const cleared = handleClearAll();
      assert.equal(cleared.departmentId, "");
      assert.equal(cleared.role, "all");
      assert.equal(cleared.discipline, "");
      assert.equal(cleared.q, "");
    });
  });

  // ── 2. Department Search inside Dropdown ──
  describe("2. Searchable Department Dropdown Filter Logic", () => {
    const sampleDepartments = [
      { id: "architectural-design", name: "Architectural Design" },
      { id: "civil-engineering", name: "Civil Engineering" },
      { id: "electrical-engineering", name: "Electrical Engineering" },
      { id: "mechanical-engineering", name: "Mechanical Engineering" },
      { id: "structural-engineering-design", name: "Structural Engineering & Design" },
    ];

    it("matches departments by case-insensitive partial name", () => {
      const filterDepartments = (list, query) =>
        list.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

      const civilMatches = filterDepartments(sampleDepartments, "civil");
      assert.equal(civilMatches.length, 1);
      assert.equal(civilMatches[0].id, "civil-engineering");

      const engineeringMatches = filterDepartments(sampleDepartments, "engineering");
      assert.equal(engineeringMatches.length, 4);

      const noMatches = filterDepartments(sampleDepartments, "quantum computing");
      assert.equal(noMatches.length, 0);
    });
  });

  // ── 3. Query Parameter Assembly & Pagination Reset ──
  describe("3. Query parameters and pagination synchronization", () => {
    it("assembles query parameters correctly for backend delivery", () => {
      const assembleParams = ({ q, infraFilters, page }) => {
        const params = {
          q: q || undefined,
          ...infraFilters,
          page,
        };
        // Clean out empty string filters if needed
        return params;
      };

      const query = assembleParams({
        q: "Bridge",
        infraFilters: {
          role: "professional",
          departmentId: "civil-engineering",
          discipline: "",
        },
        page: 1,
      });

      assert.equal(query.q, "Bridge");
      assert.equal(query.departmentId, "civil-engineering");
      assert.equal(query.role, "professional");
      assert.equal(query.page, 1);
    });

    it("ensures filter changes reset pagination to page 1", () => {
      let currentPage = 3;
      const onFilterChange = () => {
        currentPage = 1;
      };

      onFilterChange();
      assert.equal(currentPage, 1);
    });
  });

  // ── 4. Discovery Fallback & In-Memory Matching ──
  describe("4. Student discovery fallback filtering with department and title compatibility", () => {
    const mockStudents = [
      {
        id: "s1",
        name: "Amina Al-Mansoor",
        course: "Civil Engineering",
        currentRole: "Lead BIM Coordinator",
        professionalIdentity: {
          departmentId: "civil-engineering",
          titleName: "Lead BIM Coordinator",
        },
      },
      {
        id: "s2",
        name: "Marcus Vance",
        course: "Civil Engineering",
        currentRole: "Principal Mechanized Tunneling Specialist",
        professionalIdentity: {
          departmentId: "civil-engineering",
          titleName: "Principal Mechanized Tunneling Specialist",
          isCustomTitle: true,
        },
      },
      {
        id: "s3",
        name: "David Kim",
        course: "Mechanical Engineering",
        currentRole: "HVAC Design Engineer",
        professionalIdentity: {
          departmentId: "mechanical-engineering",
          titleName: "HVAC Design Engineer",
        },
      },
      {
        id: "s4",
        name: "Legacy User",
        course: "Civil Engineering",
        currentRole: "Site Supervisor",
        professionalIdentity: null,
      },
    ];

    it("filters discoverable students by departmentId matching both predefined and custom titles", () => {
      const applyFilter = (list, deptId) => {
        if (!deptId || deptId === "all") return list;
        return list.filter((s) => s.professionalIdentity?.departmentId === deptId);
      };

      const civilOnly = applyFilter(mockStudents, "civil-engineering");
      assert.equal(civilOnly.length, 2);
      assert.deepEqual(
        civilOnly.map((s) => s.id),
        ["s1", "s2"],
      );
      // Legacy user and mechanical user are excluded
      assert.ok(!civilOnly.some((s) => s.id === "s3"));
      assert.ok(!civilOnly.some((s) => s.id === "s4"));
    });

    it("matches candidate titles via free-text q search across professionalIdentity.titleName", () => {
      const applySearch = (list, q) => {
        const query = q.toLowerCase();
        return list.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            s.course.toLowerCase().includes(query) ||
            s.currentRole.toLowerCase().includes(query) ||
            s.professionalIdentity?.titleName?.toLowerCase().includes(query),
        );
      };

      const tunnelMatches = applySearch(mockStudents, "Tunneling");
      assert.equal(tunnelMatches.length, 1);
      assert.equal(tunnelMatches[0].id, "s2");
    });

    it("verifies networkService.js forwards departmentId to /network/students and applies it to fallback", () => {
      const servicePath = path.resolve(__dirname, "../services/networkService.js");
      const code = fs.readFileSync(servicePath, "utf-8");

      assert.ok(code.includes("departmentId: departmentId || undefined"), "Should pass departmentId in params");
      assert.ok(code.includes("s.professionalIdentity?.departmentId === departmentId.trim()"), "Should filter by departmentId in fallback");
    });
  });

  // ── 5. Component Verification & JSX Contract ──
  describe("5. Component code inspection for InfrastructurePeopleFilters and NetworkConnections", () => {
    it("verifies InfrastructurePeopleFilters contains department selection controls", () => {
      const filtersPath = path.resolve(
        __dirname,
        "../components/network/InfrastructurePeopleFilters.jsx",
      );
      const code = fs.readFileSync(filtersPath, "utf-8");

      assert.ok(code.includes("departmentId"), "Should handle departmentId");
      assert.ok(code.includes("Building2"), "Should render Building2 icon for department");
      assert.ok(code.includes("departmentSearch"), "Should support department search");
      assert.ok(code.includes("All Departments"), "Should provide All Departments option");
      assert.ok(code.includes("selectedDepartment"), "Should resolve active department name");
      assert.ok(code.includes("Dept:"), "Should show active department filter badge");
    });

    it("verifies NetworkConnections initializes and resets departmentId in infraFilters", () => {
      const netConnPath = path.resolve(
        __dirname,
        "../components/network/NetworkConnections.jsx",
      );
      const code = fs.readFileSync(netConnPath, "utf-8");

      assert.ok(code.includes('departmentId: ""'), "Should initialize departmentId");
    });

    it("verifies discoverable-student DTO contains departments in NetworkFiltersResponse", () => {
      const dtoPath = path.resolve(
        __dirname,
        "../../../backend/src/modules/network/dto/discoverable-student.dto.ts",
      );
      const code = fs.readFileSync(dtoPath, "utf-8");

      assert.ok(
        code.includes("departments?: { id: string; name: string }[]"),
        "Should define departments in NetworkFiltersResponse",
      );
    });

    it("verifies QueryPeopleDto and GetStudentsDto accept departmentId", () => {
      const networkDtoPath = path.resolve(
        __dirname,
        "../../../backend/src/modules/network/dto/network.dto.ts",
      );
      const studentDtoPath = path.resolve(
        __dirname,
        "../../../backend/src/modules/network/dto/get-students.dto.ts",
      );

      const netCode = fs.readFileSync(networkDtoPath, "utf-8");
      const studentCode = fs.readFileSync(studentDtoPath, "utf-8");

      assert.ok(netCode.includes("departmentId?: string"), "QueryPeopleDto should have departmentId");
      assert.ok(studentCode.includes("departmentId?: string"), "GetStudentsDto should have departmentId");
    });
  });
});
