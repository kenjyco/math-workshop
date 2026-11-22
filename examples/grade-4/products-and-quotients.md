# What does each row count?

## G46 · Reassemble the product

[G46 · goal and source](../../goals/grade-4-whole-numbers.md#g46-accounting-for-every-partial-product) · 4.NBT.B.5 · `multi-product`, `laws`, `place` · MP7, MP1

The two multiplication forms here are two digits by two digits and up to four digits by one digit. In the [four-region rectangle](../four-region-multiplication.md#area-model-for-23--14), each width meets each height exactly once. Across the columns 20 + 3 = 23, down the rows 10 + 4 = 14. Read across: 200 + 30 = 230 and 80 + 12 = 92. Read down instead: 200 + 80 = 280 and 30 + 12 = 42. Both partitions cover **322 square units**. Check by taking one 23 away from fifteen 23s: 345 − 23 = 322.

### Four copies of 2,036

A second rectangle has length 2,036 units and width 4 units. Split the length as 2,000 + 0 + 30 + 6. The empty hundreds place contributes zero width. Its place stays visible in the equation. Each of the other three strips spans all four rows.

```text
  8000    4 × 2,000
     0    4 × 0 hundreds
   120    4 × 30
+   24    4 × 6
------
  8144
```

Read the model as 4 × (2,000 + 0 + 30 + 6) = 8,000 + 0 + 120 + 24 = **8,144**. Check the sum by place: 8 thousands, 1 hundred, 4 tens and 4 ones. For a different partition, 2,036 = 2,040 − 4, so four copies total 8,160 − 16 = 8,144. Doubling 2,036 twice also gives 4,072 then 8,144.

### Read the recorded work for 23 × 14

| Visible work for 23 × 14 | What can be established? |
|---|---|
| Splits 20 + 3 and 10 + 4. Cells 200, 30, **60**, 12. Scratch 302. Answer 322. | The splits work. The 20-by-4 region must be 80. The scratch sum follows the displayed cells. The correct answer field does not validate that cell. |
| Cells 200, 30, 80, 12. Scratch and answer 312. | All areas are right. Adding them gives 322. The first visible discrepancy is the sum. |
| Rows 92 and 230 aligned, no total or answer | Both rows work. The record is unfinished. Add them to get 322. |
| 200 + 30 + 80 = 310 | The 3-by-4 corner is missing. Adding its 12 restores 322. |
| 200 + 30 + 80 + 12 + 12 = 334 | The same 3-by-4 corner appears twice. Removing one 12 restores 322. |
| Cells 200, 30, 80, 12. Scratch 322. Answer 232. | The scratch result agrees with the independent calculation. The transfer changes the hundreds and tens digits. |
| Answer 312 alone | The value differs from 322. The first faulty calculation is unknown. |

**Parent bridge.** Stack 92 ones under 230 ones, aligning place columns. Those are the 4-row and 10-row parts of one rectangle. The area argument explains both rows. [Pilot stacked calculation](../four-region-multiplication.md#parent-bridge)

## G47 · Count groups as amounts come off

[G47 · goal and source](../../goals/grade-4-whole-numbers.md#g47-counting-groups-removed-in-partial-quotients) · 4.NBT.B.6 · `multi-div`, `divide`, `place` · MP1

Use dividends of up to four digits and positive one-digit divisors. For 84 ÷ 4, one partial quotient counts **groups of four**. Removing 40 items credits ten groups. Start each path at 84 items and zero groups.

| Path | Groups this step | Items removed | Groups so far | Items left | Rebuild 84 |
|---|---:|---:|---:|---:|---|
| A | 10 | 40 | 10 | 44 | 4 × 10 + 44 |
| A | 10 | 40 | 20 | 4 | 4 × 20 + 4 |
| A | 1 | 4 | 21 | 0 | 4 × 21 + 0 |
| B | 20 | 80 | 20 | 4 | 4 × 20 + 4 |
| B | 1 | 4 | 21 | 0 | 4 × 21 + 0 |

Both paths give **21 groups** and zero remaining. For 2,487 ÷ 6 start again with zero groups. Each row removes six items for each new group. The last column adds the remaining items back to all items accounted for.

| Groups this step | Items removed | Groups so far | Items left | Rebuild 2,487 |
|---:|---:|---:|---:|---|
| 100 | 600 | 100 | 1,887 | 600 + 1,887 |
| 300 | 1,800 | 400 | 87 | 2,400 + 87 |
| 10 | 60 | 410 | 27 | 2,460 + 27 |
| 4 | 24 | 414 | 3 | 2,484 + 3 |

The last 3 items cannot make another group of six: **414 R3**, with 0 ≤ 3 < 6. Check with a larger first chunk. Remove 400 groups at once, leaving 87. Fourteen more groups use 84. That leaves three. Compare the original operands and answer field: 6 × 414 + 3 = 2,487.

| Visible record | Check and continuation or correction |
|---|---|
| First removal 600, credit 10 groups, remainder 1,887 | The subtraction works. Ten groups use only 60. The claimed row rebuilds 60 + 1,887 = 1,947. Credit 100 groups. |
| Correct steps 100, 300, 10, 4. Final sum 404 R3. | The final group sum drops ten. With 404, reconstruction gives 2,427. Restore the total 414. |
| Stops after 400 groups with 87 left | This row rebuilds 2,487. It is unfinished because 87 still contains groups of six. Continue on a fresh line with ten groups, leaving 27. |

The [pilot ledger for 1,205 ÷ 4](../quotient-zero-and-capacity.md#count-groups-of-four) uses either one removal of 300 groups or three removals of 100 groups before the last group. Both paths give 301 groups and one item left.

**Parent bridge.** Join A's two tens of groups to see B's twenty. Likewise, 400 groups, 10 groups and 4 groups appear as hundreds, tens and ones in 414. The amount removed always includes the factor six in this last problem.

## G48 · Which zero occupies the tens place?

[G48 · goal and source](../../goals/grade-4-whole-numbers.md#g48-writing-quotient-digits-in-their-places) · 4.NBT.B.6 · `multi-div`, `divide`, `place` · MP6

In the [1,205 ÷ 4 pilot](../quotient-zero-and-capacity.md#write-the-quotient-by-place), twelve hundreds shared among four give three **hundreds** per share. The zero tens digit keeps the final one in the ones place. Check 4 × 301 + 1 = 1,205. The dividend lies between 4 × 300 and 4 × 310, so 31 R1 cannot fit either the size or the reconstruction (125).

Now share 2,436 among six. Before calculating, 6 × 400 = 2,400 and 6 × 410 = 2,460. The quotient lies from 400 to just below 410.

```text
      406
     ----
6 )  2436
    -24
     --
      03
      -0
      --
       36
      -36
       --
        0
```

| Current place | Amount now available | Allocate to each share | What remains before the next digit |
|---|---|---|---|
| Thousands | 2 thousands | No full thousand per share | Exchange both for 20 hundreds. |
| Hundreds | 20 + 4 = 24 hundreds | 4 hundreds, or 400 ones | Subtract 24 hundreds. Zero hundreds remain. |
| Tens | 0 exchanged hundreds and the digit 3 give 03 tens | 0 tens per share | Subtract 0 tens. All 3 tens remain. The final input digit 6 is still waiting. |
| Ones | Exchange 3 tens for 30 ones, then bring in 6 ones | 36 ÷ 6 = 6 ones | Subtract 36 ones. Zero ones remain. |

“03” in the tens step reads **three tens**. Writing 30 in that column calculation would mean thirty tens. The same three tens become thirty **ones** only at the exchange. A stopped record ending at 03 can continue on a new line with 0 in the tens quotient place, then 36 ones to share.

Result **406 R0**. Check 6 × (400 + 0 + 6) + 0 = 2,400 + 36 = 2,436 and 0 ≤ 0 < 6.

| Scratch and answer field | What the evidence says |
|---|---|
| Correct rows above, scratch 406, copied as 46 | The omitted zero changes 400 to 40. The copy is below 400 and gives 6 × 46 = 276. |
| Scratch ends in 406, copied as 460 | Six ones have moved to tens. The copy exceeds the bound and gives 6 × 460 = 2,760. |
| Scratch says “03 tens ÷ 6 gives 3 tens per share.” Selected answer 406. | The selection reconstructs the dividend. The written tens allocation would require 18 tens, exceeding the 3 available. The selection alone cannot support the scratch step. |
| Only 460 recorded | Its magnitude and inverse product fail. No intermediate line identifies a first faulty step. |

**Parent bridge.** Point to the zero below 24, then to the zero above the 3. The first records hundreds left after subtraction. The second records tens allocated to each share. Bringing down the next digit exchanges the remainder into a smaller unit.
