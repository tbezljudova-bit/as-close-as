import type { SentenceModel, SentenceName } from "../lib/sentence";

type SentenceViewProps = {
  sentence: SentenceModel;
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function SentenceView({ sentence, selectedId, onSelect }: SentenceViewProps) {
  if (sentence.kind === "pair") {
    return (
      <h1 className="sentence">
        {sentence.originName} is as close to{" "}
        <span className="sentence-destination">{sentence.targetName}</span>{" "}
        <span className="num nowrap">({sentence.distanceLabel})</span> as it is to{" "}
        <NameList names={sentence.names} selectedId={selectedId} onSelect={onSelect} />.
      </h1>
    );
  }
  if (sentence.kind === "radius") {
    return (
      <h1 className="sentence">
        {sentence.originName} is{" "}
        <span className="num nowrap">{sentence.distanceLabel}</span> from{" "}
        <NameList names={sentence.names} selectedId={selectedId} onSelect={onSelect} />.
      </h1>
    );
  }
  return <p className="sentence">{sentence.plain}</p>;
}

function NameList({
  names,
  selectedId,
  onSelect,
}: {
  names: SentenceName[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return names.map((name, index) => {
    let prefix = "";
    if (index > 0 && index === names.length - 1) {
      prefix = names.length === 2 ? " and " : ", and ";
    } else if (index > 0) {
      prefix = ", ";
    }
    return (
      <span key={name.id}>
        {prefix}
        <button
          type="button"
          className="sentence-name"
          aria-pressed={selectedId === name.id}
          onClick={() => onSelect(name.id)}
        >
          {name.name}
        </button>
      </span>
    );
  });
}
