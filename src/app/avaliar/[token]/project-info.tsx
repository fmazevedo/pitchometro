import type { GroupDTO } from "@/lib/data";

export function ProjectInfo({ group }: { group: Pick<GroupDTO, "description" | "members"> }) {
  return (
    <div className="project-info">
      {group.description ? <p>{group.description}</p> : <p>O grupo ainda não cadastrou uma descrição do projeto.</p>}
      {group.members.length ? (
        <small>
          <b>Integrantes:</b> {group.members.join(", ")}
        </small>
      ) : null}
    </div>
  );
}
