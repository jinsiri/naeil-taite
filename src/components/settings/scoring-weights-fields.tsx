"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import {
  scoringPreferencesWeightsSchema,
  type ScoreWeights,
} from "@/lib/jobs/scoring";

const labels: Record<keyof ScoreWeights, string> = {
  careerCapital: "커리어 자산",
  roleFit: "직무 적합도",
  companyQuality: "회사 조건",
  targetAlignment: "커리어 목표",
  personalFit: "개인 선호",
  publicTransitFit: "대중교통 출퇴근",
};

export function ScoringWeightsFields({ weights }: { weights: ScoreWeights }) {
  const { control } = useForm<ScoreWeights>({
    defaultValues: weights,
    resolver: zodResolver(scoringPreferencesWeightsSchema),
    mode: "onChange",
  });
  const values = useWatch({ control });
  const total = Object.values(values).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  return (
    <div className="space-y-4">
      <p
        id="weights-total"
        role="status"
        className={
          total === 100 ? "text-sm text-primary" : "text-sm text-destructive"
        }
      >
        가중치 총계 {total}/100
        {total < 100
          ? ` · ${100 - total}%를 더 배분해 주세요.`
          : total > 100
            ? ` · ${total - 100}%를 줄여 주세요.`
            : " · 모두 배분했어요."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(labels) as (keyof ScoreWeights)[]).map((key) => (
          <Controller
            key={key}
            control={control}
            name={key}
            render={({ field }) => (
              <label className="space-y-2 text-sm font-medium">
                {labels[key]} (%)
                <Input
                  {...field}
                  name={`weight_${key}`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  onChange={(event) =>
                    field.onChange(Number(event.target.value))
                  }
                  aria-describedby="weights-total"
                  ref={(input) => {
                    field.ref(input);
                    input?.setCustomValidity(
                      total === 100 ? "" : "비중 합계를 100%로 맞춰 주세요.",
                    );
                  }}
                />
              </label>
            )}
          />
        ))}
      </div>
    </div>
  );
}
