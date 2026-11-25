# A zero in the quotient and one more vehicle

Grade 4 · Partial quotients, a zero tens digit, and a remainder in context

**[4.NBT.B.6](https://www.thecorestandards.org/Math/Content/4/NBT/B/6/)** covers whole-number quotients and remainders for dividends of up to four digits and positive one-digit divisors. [Common Core State Standards for Mathematics, p. 30](https://corestandards.org/wp-content/uploads/2023/09/ADA-Compliant-Math-Standards.pdf#page=30)

**[4.OA.A.3](https://www.thecorestandards.org/Math/Content/4/OA/A/3/)** includes interpreting remainders in multistep whole-number problems. [Common Core State Standards for Mathematics, p. 29](https://corestandards.org/wp-content/uploads/2023/09/ADA-Compliant-Math-Standards.pdf#page=29)

There are 1,205 people and four passenger seats per vehicle. How many vehicles can be filled? How many vehicles are needed to seat everyone?

## Count groups of four

For 1,205 ÷ 4, each partial quotient counts groups of four. The amount removed at each step is four times that step’s group count. Each row checks that four times the total group count so far plus the amount remaining equals 1,205.

**Remove 300 groups, then 1 group.**

| Amount removed | Groups this step | Amount remaining | Total groups so far | Check against 1,205 |
| ---: | ---: | ---: | ---: | :--- |
| 0 (start) | 0 | 1,205 | 0 | 4 × 0 + 1,205 = 1,205 |
| 1,200 | 300 | 5 | 300 | 4 × 300 + 5 = 1,205 |
| 4 | 1 | 1 | 301 | 4 × 301 + 1 = 1,205 |

**Remove 100 groups at a time, then 1 group.**

| Amount removed | Groups this step | Amount remaining | Total groups so far | Check against 1,205 |
| ---: | ---: | ---: | ---: | :--- |
| 0 (start) | 0 | 1,205 | 0 | 4 × 0 + 1,205 = 1,205 |
| 400 | 100 | 805 | 100 | 4 × 100 + 805 = 1,205 |
| 400 | 100 | 405 | 200 | 4 × 200 + 405 = 1,205 |
| 400 | 100 | 5 | 300 | 4 × 300 + 5 = 1,205 |
| 4 | 1 | 1 | 301 | 4 × 301 + 1 = 1,205 |

## Write the quotient by place

Share the same amount among four equal groups to see the place values in the quotient.

| Place | Amount to share | Quotient digit and its value in each share | Amount left at this place |
| --- | --- | --- | --- |
| Thousands | 1 thousand | No leading digit is written | 1 thousand, exchanged for 10 hundreds |
| Hundreds | 10 hundreds + 2 hundreds = 12 hundreds | 3 means 3 hundreds | 12 hundreds − 12 hundreds = 0 hundreds |
| Tens | 0 hundreds gives 0 tens. Add the dividend’s 0 tens. | 0 means 0 tens | 0 tens − 0 tens = 0 tens |
| Ones | 0 tens gives 0 ones. Add the dividend’s 5 ones. | 1 means 1 one | 5 ones − 4 ones = 1 one |

The long-division layout keeps the digits aligned with their places.

```text
      301 R1
     ____
4 )  1205
    -12
     --
      00
      -0
      --
       05
       -4
       --
        1
```

The zero in the hundreds column of `00` came from subtracting 12 hundreds. The next zero, in the tens column, is the dividend digit brought down. The zero above it records zero tens in the quotient. In `05`, the zero came from subtracting zero tens and the 5 is the ones digit brought down. The final 1 below the line is one remaining one.

So **1,205 ÷ 4 = 301 R1**. The quotient is 300 + 0 + 1. Multiplying back gives 4 × 301 + 1 = 1,204 + 1 = 1,205, and the remainder satisfies 0 ≤ 1 < 4.

**Omitted-zero error.** Writing 31 drops the tens placeholder. That answer is already too small because 300 groups of four fit. It reconstructs 4 × 31 + 1 = 125.

**Parent bridge.** Bringing down a digit means exchanging what remains for units of the next smaller place and adding the dividend’s digit there. The 3 hundreds in the quotient count the same 300 groups of four as the ledger’s three 100-group steps. With only 5 left, the ledger can count just one more group of four. Long division records that as 0 tens and 1 one in the quotient.

## Find the vehicles needed

Let `v` be the fewest vehicles that can seat everyone. Since 1,200 ÷ 4 = 300 and 1,205 is close to 1,200, expect about 300 vehicles.

The division gives 301 full vehicles with one person still needing a seat. That person needs one more vehicle, so `v = 301 + 1 = 302`.

| Vehicles | Passenger seats | Capacity check |
| ---: | ---: | --- |
| 301 | 301 × 4 = 1,204 | One seat short |
| 302 | 302 × 4 = 1,208 | Seats everyone, with three seats free |

**Parent bridge.** Read “301 remainder 1” as “301 full vehicles and 1 person left.” That last person makes **302 vehicles** necessary.
