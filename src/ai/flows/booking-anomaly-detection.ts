'use server';

/**
 * @fileOverview A booking anomaly detection AI agent.
 *
 * - detectBookingAnomaly - A function that handles the anomaly detection process.
 * - DetectBookingAnomalyInput - The input type for the detectBookingAnomaly function.
 * - DetectBookingAnomalyOutput - The return type for the detectBookingAnomaly function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectBookingAnomalyInputSchema = z.object({
  userActivities: z
    .string()
    .describe(
      'A description of user activities during or after bookings, including details such as booking time, locations, payment info, contact info, etc.'
    ),
});
export type DetectBookingAnomalyInput = z.infer<typeof DetectBookingAnomalyInputSchema>;

const DetectBookingAnomalyOutputSchema = z.object({
  anomalyDetected: z
    .boolean()
    .describe('Whether or not an anomaly is detected in the booking.'),
  anomalyDescription: z
    .string()
    .describe('The description of the anomaly detected, if any.'),
  recommendations: z
    .string()
    .describe('Recommendations and guidelines for operators based on the anomaly.'),
});
export type DetectBookingAnomalyOutput = z.infer<typeof DetectBookingAnomalyOutputSchema>;

export async function detectBookingAnomaly(
  input: DetectBookingAnomalyInput
): Promise<DetectBookingAnomalyOutput> {
  return detectBookingAnomalyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectBookingAnomalyPrompt',
  input: {schema: DetectBookingAnomalyInputSchema},
  output: {schema: DetectBookingAnomalyOutputSchema},
  prompt: `You are an expert in detecting anomalies in transport bookings.

You will use the provided user activities to identify any irregularities, potential fraud, or other issues.
Based on your analysis, you will determine whether an anomaly is present and provide a detailed description.
Additionally, you will offer recommendations and guidelines for operators to address the anomaly.

User Activities: {{{userActivities}}}`,
});

const detectBookingAnomalyFlow = ai.defineFlow(
  {
    name: 'detectBookingAnomalyFlow',
    inputSchema: DetectBookingAnomalyInputSchema,
    outputSchema: DetectBookingAnomalyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

