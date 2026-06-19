/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Pure React widget rendered inside the chat as a `user_defined` response.
 *
 * Demonstrates: rendering Carbon's `Card` + `Toolbar` + `CardSteps` + `CardFooter`
 * composition (the storybook `WithSteps` preview-card story) driven entirely
 * by props. Each `upsertMessage` call re-renders this component with new step
 * data — no internal state means React reconciles in place without remount.
 *
 * Start reading at: `StepsCard` below.
 */

import {
  Card,
  CardFooter,
  CardSteps,
} from "@carbon/ai-chat-components/es/react/card.js";
import Toolbar from "@carbon/ai-chat-components/es/react/toolbar.js";
import { ICON_INDICATOR_KIND } from "@carbon/web-components/es/components/icon-indicator/defs.js";
import React from "react";

type StepKind = "NOT-STARTED" | "IN-PROGRESS" | "SUCCEEDED";

interface StepsCardData {
  user_defined_type: "steps_card";
  title: string;
  status: string;
  showFooter: boolean;
  steps: Array<{
    label: string;
    title: string;
    description: string;
    kind: StepKind;
  }>;
}

interface StepsCardProps {
  data: StepsCardData;
}

function StepsCard({ data }: StepsCardProps) {
  // Map the JSON-friendly string kind to Carbon's icon-indicator enum. Keeping
  // the payload as plain strings means the message data stays serializable.
  const steps = data.steps.map((step) => ({
    label: step.label,
    title: step.title,
    description: step.description,
    kind: ICON_INDICATOR_KIND[step.kind],
  }));

  return (
    // Spacing rule lives with the host page; see index.html.
    <div className="steps-card-container">
      <Card>
        <div slot="header" className="preview-card">
          <Toolbar className="preview-card-toolbar">
            <div slot="title">
              <div className="title-container">
                <h4>{data.title}</h4>
                <p>{data.status}</p>
              </div>
            </div>
          </Toolbar>
        </div>

        <div slot="body" className="preview-card preview-card-steps">
          <CardSteps steps={steps} />
        </div>

        {data.showFooter && <CardFooter size="md" actions={[]} />}
      </Card>
    </div>
  );
}

export { StepsCard };
export type { StepsCardData };
