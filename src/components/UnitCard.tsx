import { Link } from "solid-app-router";
import { RouterUtils } from "solid-app-router";
import { Component, createMemo, createResource, Show } from "solid-js";
import { ITEMS, PRETTY_AGE_MAP } from "../config";
import { getUnitStats } from "../query/stats";
import { getMostAppropriateVariation } from "../query/utils";
import { civAbbr, civConfig, UnifiedItem, Unit } from "../types/data";
import { Card, CardHeader } from "./Cards";
import { StatBar, StatCosts, StatDps, StatNumber } from "./Stats";
import { globalAgeFilter } from "./Toolbar";

const increaseBarSizeForClass = ["siege", "elephant", "incendiary"];
function getBarSize(unit: UnifiedItem<Unit>, baseSize: number, increasedSize: number) {
  return unit.classes.some((c) => increaseBarSizeForClass.includes(c)) ? increasedSize : baseSize;
}

export const UnitCard: Component<{ unit: UnifiedItem<Unit>; civ?: civConfig }> = (props) => {
  const [stats] = createResource(() => getUnitStats(ITEMS.UNITS, props.unit, props.civ));
  const variation = createMemo(() => getMostAppropriateVariation<Unit>(props.unit, props.civ));

  return (
    <Card item={props.unit} civ={props.civ}>
      <Show when={stats()}>
        <>
          <div class="flex flex-col gap-4 mb-8">
            <StatBar label="Hitpoints" icon="heart" stat={stats().hitpoints} max={getBarSize(props.unit, 500, 1000)} />
            <StatBar label="Siege Attack" icon="meteor" stat={stats().siegeAttack} max={500} />
            <StatBar label="Melee Attack" icon="swords" stat={stats().meleeAttack} max={getBarSize(props.unit, 50, 100)} />
            <StatBar label="Ranged Attack" icon="bow-arrow" stat={stats().rangedAttack} max={getBarSize(props.unit, 50, 300)} />
            <StatBar
              label={props.unit.classes.includes("incendiary") ? "Fire Attack" : "Torch Attack"}
              icon="fire"
              stat={stats().fireAttack}
              max={getBarSize(props.unit, 50, 300)}
            />
            <StatBar label="Melee Armor" icon="shield-blank" stat={stats().meleeArmor} max={20} displayAlways={true} />
            <StatBar label="Ranged Armor" icon="bullseye-arrow" stat={stats().rangedArmor} max={20} displayAlways={true} />
            <StatBar label="Fire Armor" icon="block-brick-fire" stat={stats().fireArmor} max={20} />
          </div>
          <div class="flex flex-col gap-4 mt-auto">
            <div class="flex gap-4  flex-wrap">
              <StatNumber label="Move Spd" stat={stats().moveSpeed} unitLabel="T/S"></StatNumber>
              <StatNumber label="Atck Spd" stat={stats().attackSpeed} unitLabel="S"></StatNumber>
            </div>
            <StatDps label="Damage" speed={stats().attackSpeed} attacks={[stats().rangedAttack, stats().meleeAttack, stats().siegeAttack]}></StatDps>
            <StatCosts costs={variation()?.costs} />
          </div>
        </>
      </Show>
    </Card>
  );
};
