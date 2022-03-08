import { action, makeAutoObservable, observable } from "mobx";
import { DateTime, Interval, Duration } from "luxon";
import { Content } from "@tiptap/react";
import { generateAutoId } from "../utils/Utils";
import { Lens } from "../view/QuantaView";

// https://github.com/gvergnaud/ts-pattern
/** Acts as a type discriminator */
export type Type<T extends string> = {type: T}

export type Concept = Content
export type Time =
  | ({ time: TimePoint | TimeLength | TimeField } & Type<"Time">)
  | undefined;
export type TimePoint = DateTime; 
export type TimeLength = Duration;
export type TimeField = Interval;
export type TimeOps = {
  createTime: () => Time
}
export const TimeCorrect: TimeOps = {
  createTime: () => {
    return {type: "Time", time: DateTime.local(2017, 5, 15, 8, 30)}
  }
}

export type EmotionName = {emotionName: string} & Type<"EmotionName">
export type Void = "Undefined"

export type RelationToRelation = Quanta

type CausalOrder = Precedes | During | After;
// Refer to Casual Structure wikipedia
// Omit strictly precedes vs chronogically procedes for now
export type Precedes = "<";
export type During = "o"
export type After = ">"

export type SpectralSignatureT = {
  colour: string;
  dispersion: number;
  halfCycleDuration: number;
  repeatDelay: number;
};
const SpectralSignature = () => {
  const spectralSignature: SpectralSignatureT = {
    colour: "#FFFFFF",
    dispersion: 1,
    halfCycleDuration: 1,
    repeatDelay: 1,
  };
  return spectralSignature;
};

// Time Concept
// One hypothesis is that I should have a kind of timeline as one construct
// and then the idea of causality is something entirely different but relating to
// the anchors of the timeline
// Fundamentally, three concepts of time that need to be handled 
// This model of time is kind of like a world line, with dimensions
// Space and time
// Time represents the kind of absolute timeline, as well as durations
// But Space here, allows us to model causality or the direction of relations between events
// So even though we call causality "time", in physics it's modelled as space
// Causality - Direction of Flow Of Energy
// Durations - A kind of volume 
// Durations are extended into a capacity vs volume, or a time and anti-time
// Absolute Points and Intervals - A random point in space, plus a container to mark space around it
// Refer to time geography and time distance diagrams


// Generally in deciding which data structure to use, we have to consider whether it's suitable
// locally, as well as whether the database can actually query it
// Very little use in having the right data structure, if you have to download each structure
// and then check it
// At a high level, the data structure present should be ergonomic locally, per object, as well as 
// globally allow for high level analysis and querying 
export type QuantaIdT = string
export type Quanta = {
  shen: ShenT;
  readonly id: QuantaIdT;
  view: Lens;
  information: Concept;
  // This should be a set, or map for lookup performance,
  // but it's fine to have it as an array for now.
  // Basically the constraint needs to be, each element in the list has to be unique.
  // When creating emotional relations to things, so a relation to a thing,
  // The way that you handle it is that, there is a unique emotional relation that wraps the thing
  // But this unique emotional relation has a relationFrom the actual over arching emotion
  relationsTo: QuantaIdT[]; // unlike other apps, react components can have fetching logic, not pure presentation
  // Or maybe, you initialise a Store <-> View pair with each child
  // This is so the item being related to, knows who is relating to it
  relationsFrom: QuantaIdT[];
  energy: SpectralSignatureT; // aggregation all relations' 气质, or energy
  causalRelationsTo: QuantaIdT[];
  causalRelationsFrom: QuantaIdT[]
  time: Time
} & Type<"Qi">;
type Qi = {
  createQi: (shen?: ShenT) => Quanta | ShenT;
  // parseRelationsFromInformation: (q: QiT) => QiT["relationsTo"];
  // parseEnergyFromInformation: (q: QiT) => QiT["energy"];
  createRelationTo: (q: Quanta) => { q1: Quanta; sibling: Quanta };
  linkRelationTo: (q: Quanta, qTo: Quanta) => { q1: Quanta; sibling: Quanta };
  linkRelationFrom: (q: Quanta, qFrom: Quanta) => { q1: Quanta };
  // TODO:
  // createCausalRelation: (
  //   q: QiT,
  //   qTo: QiT
  // ) => { q1: QiT };
  convertIntoQi: (shen: ShenT, richText: Content) => Quanta;
  // This parses the richText and determines what, if any relations are embedded
  // within the Content (ProseMirror format). Essentially to keep
  // the Content and the Qi representation in sync. But return type if problematic
  // since it's currently OR types, but Content could contain multiple
  // parseRichText: (
  //   q: QiT,
  //   field: Omit<QiT, "shen" | "id" | "information">
  // ) => QiT["relations"] | QiT["energy"] | QiT["causalRelations"];
};
export const QiCorrect: Qi = {
  createQi: (shen?: ShenT) => {
    if (shen) {
      // TODO: need to create qi on shen too
      return observable({
        type: "Qi",
        shen: shen!,
        id: generateAutoId(),
        view: "Bubble",
        information: {
          concept: { richText: "....", type: "RichText" },
          type: "Concept",
        },
        relationsTo: [],
        relationsFrom: [],
        energy: SpectralSignature(),
        causalRelationsTo: [],
        causalRelationsFrom: [],
        time: TimeCorrect.createTime(),
      }) as Quanta;
    } else {
      return observable({
        type: "Shen",
        id: generateAutoId(),
        view: "Bubble",
        information: {
          concept: { richText: "....", type: "RichText" },
          type: "Concept",
        },
        relationsTo: [],
        relationsFrom: [],
        energy: SpectralSignature(),
        time: TimeCorrect.createTime(),
      }) as ShenT;
    }
  },
  // TODO
  // parseEnergyFromInformation: action((q: QiT) => {
  //   // calculate QiZhi of all children of q, then change QiZhi of this q
  //   return QiZhi()
  // }),
  createRelationTo: action((q: Quanta, qz?: SpectralSignatureT) => {
    let relation = QiCorrect.createQi(q.shen) as Quanta;
    let rtr = QiCorrect.createQi(q.shen) as Quanta;
    q.relationsTo.push(relation.id);
    return { q1: q, sibling: relation };
  }),
  // TODO:
  // createCausalRelation: action((q: QiT, c: CausalOrder, qTo: QiT) => { 
  //   q.causalRelations.set(qTo, [c])
  //   return { q1: q };
  // }),
  convertIntoQi: action((shen: ShenT, richText: Content) => {
    // Takes the span of richText and creates a new q out of it
    // Also places into store
    let q = QiCorrect.createQi() as Quanta;
    return q;
  }),
  linkRelationTo: function (q: Quanta, qTo: Quanta): { q1: Quanta; sibling: Quanta; } {
    throw new Error("Function not implemented.");
  },
  linkRelationFrom: function (q: Quanta, qFrom: Quanta): { q1: Quanta; } {
    throw new Error("Function not implemented.");
  }
};
// This is simply an empty placeholder, that will morph into actual Qi when 
// data is loaded
export const DefaultQi = () => {
  return QiCorrect.createQi() as Quanta
}

// Shen or 神 is the aggregation of all qi for an individual user. It's the final qi to be computed in this
// divide and conquer fashion. It stores references to all qi, but the database store itself
// stores the actual qi. As a result, 神 object, shouldn't be queried in order to get qi. Instead,
// the database store should be queried, since this is much faster.
export type ShenT = Omit<Quanta, "type" | "shen" | "causalRelationsFrom" | "causalRelationsTo"> & Type<"Shen">
export type Shen = {
  createShen: () => ShenT;
};
export const GraphCorrect: Shen = {
  // Need type coercion, not sure why TS isn't inferring that createQi() with no args
  // doesn't return ShenT (which it should)
  createShen: () => observable(QiCorrect.createQi() as ShenT),
};

export const ExampleShen = () => {
  let shen = GraphCorrect.createShen();
  return shen;
}
