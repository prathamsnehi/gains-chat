import DatewiseGraph from "@/app/components/DatewiseGraph";

export default function GraphViewScreen({ route }) {
  return (
    <>
      <DatewiseGraph exerciseId={route.params.exerciseId} />
      {/* this exerciseId is in the form of a string currently, and needs to be converted to 
      ObjectId in the DatewiseGraph component */}
    </>
  );
}
