import { action, makeAutoObservable, observable } from "mobx";
import { DateTime, Interval, Duration } from "luxon";
import { Content } from "@tiptap/react";
import { generateAutoId } from "../utils/Utils";

// https://github.com/gvergnaud/ts-pattern
/** Acts as a type discriminator */
export type Type<T extends string> = {type: T}

// TODO: Maybe concept should just be limited to rich text, since the other relational fields model time and emotions?
export type Concept = { concept: RichText | EmotionName | Void } & Type<"Concept">;
export type RichText = { richText: Content } & Type<"RichText">;
export const RichText = () => {
  return observable({
    richText: "",
    type: "RichText",
  });
};
export type Time = { time: TimePoint | TimeLength | TimeField } & Type<"Time">;
export type TimePoint = DateTime; 
export type TimeLength = Duration;
export type TimeField = Interval;

export type EmotionName = {emotionName: string} & Type<"EmotionName">
export type Void = "Undefined"

export type RelationToRelation = QiT

type CausalOrder = Precedes | During | After;
// Refer to Casual Structure wikipedia
// Omit strictly precedes vs chronogically procedes for now
export type Precedes = "<";
export type During = "o"
export type After = ">"

export type QiZhiT = {
  colour: string;
  dispersion: number;
  halfCycleDuration: number;
  repeatDelay: number;
};
const QiZhi = () => {
  const qiZhi: QiZhiT = {
    colour: "#FFFFFF",
    dispersion: 1,
    halfCycleDuration: 1,
    repeatDelay: 1,
  };
  return qiZhi;
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
export type QiT = {
  shen: ShenT;
  readonly id: number;
  information: Concept;
  // This should be a set, or map for lookup performance,
  // but it's fine to have it as an array for now.
  // Basically the constraint needs to be, each element in the list has to be unique.
  // When creating emotional relations to things, so a relation to a thing,
  // The way that you handle it is that, there is a unique emotional relation that wraps the thing
  // But this unique emotional relation has a relationFrom the actual over arching emotion
  relationsTo: QiIdT[]; // unlike other apps, react components can have fetching logic, not pure presentation
  // Or maybe, you initialise a Store <-> View pair with each child
  // This is so the item being related to, knows who is relating to it
  relationsFrom: QiIdT[];
  energy: QiZhiT; // aggregation all relations' 气质, or energy
  causalRelationsTo: QiIdT[];
  causalRelationsFrom: QiIdT[]
  time: Time
} & Type<"Qi">;
type Qi = {
  createQi: (shen?: ShenT) => QiT | ShenT;
  changeQi: (q: QiT, meaning: Concept) => QiT;
  calculateQiZhi: (q: QiT) => QiT;
  createRelation: (q: QiT, qz?: QiZhiT) => { q1: QiT; sibling: QiT };
  createCausalRelation: (
    q: QiT,
    c: CausalOrder,
    qTo: QiT
  ) => { q1: QiT };
  convertIntoQi: (shen: ShenT, richText: Content) => QiT;
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
        id: Date.now() + Math.random(),
        information: {concept: {richText: "....", type: "RichText"}, type: "Concept"},
        relationsTo: [],
        relationsFrom: [],
        energy: QiZhi(),
        causalRelations: new Map<QiT, CausalOrder[]>().set(
          //@ts-ignore
          {time: DateTime.local(), type: "Time"},
          [">"]
        ),
        time: 
      }) as QiT;
    } else {
      return observable({
        type: "Shen",
        id: Date.now() + Math.random(),
        information: {
          concept: {
            richText: `
            ....
            `,
            type: "RichText",
          },
          type: "Concept",
        },
        relations: new Map<QiT, RelationToRelation[]>(),
        energy: QiZhi(),
      }) as ShenT;
    }
  },
  changeQi: action((q: QiT, meaning: Concept) => {
    q.information = meaning;
    return q;
  }),
  calculateQiZhi: action((q: QiT) => {
    // calculate QiZhi of all children of q, then change QiZhi of this q
    return q
  }),
  createRelation: action((q: QiT, qz?: QiZhiT) => {
    let relation = QiCorrect.createQi(q.shen) as QiT;
    let rtr = QiCorrect.createQi(q.shen) as QiT;
    q.relations.set(relation, [rtr])
    return {q1: q, sibling: relation};
  }),
  createCausalRelation: action((q: QiT, c: CausalOrder, qTo: QiT) => { 
    q.causalRelations.set(qTo, [c])
    return { q1: q };
  }),
  convertIntoQi: action((shen: ShenT, richText: Content) => {
    // Takes the span of richText and creates a new q out of it
    // Also places into store
    let q = QiCorrect.createQi() as QiT
    return q
  })
};
// This is simply an empty placeholder, that will morph into actual Qi when 
// data is loaded
export const DefaultQi = () => {
  return QiCorrect.createQi() as QiT
}

export type ShenT = Omit<QiT, "type" | "shen" | "causalRelations"> & Type<"Shen">
export type Shen = {
  createShen: () => ShenT;
  createRelation: (s: ShenT, ) => { q: QiT; s1: ShenT };
};
export const GraphCorrect: Shen = {
  createShen: () => observable(QiCorrect.createQi() as ShenT),
  createRelation: action((s: ShenT) => {
    let q: QiT = QiCorrect.createQi(s) as QiT;
    s!.relations.set(q, []);
    return { q: q, s1: s };
  }),
};
// const ShenFast: Shen = {};
type ShenChecker = (sCorrect: Shen, sFast: Shen) => boolean;
const ShenCheckerCorrect: ShenChecker = (sCorrect: Shen, sFast: Shen) => true;

export const ExampleShen = () => {
  let shen = GraphCorrect.createShen();
  let tuple: { q: QiT; s1: ShenT } = GraphCorrect.createRelation(shen);
  let result = QiCorrect.createRelation(tuple.q)
  QiCorrect.createCausalRelation(tuple.q, "<", result.q1);
  return shen;
}

export type QiIdT = {
  id: string;
};
export const QiId = () => ({
  id: generateAutoId(),
});
export type ShenIdList = {
  nodes: QiNodeT[],
  relations: [QiID, RelationToRelation, QiID], // many qi, to many possible qi relations
  causalRelations: [QiID, CausalOrder, QiID] // many qi, to many possible qi relations
}


