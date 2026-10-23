package workshop

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)

// Safety ceilings, not lesson defaults. These bound counters, pads and grids.
const MaxCountOperand = 5
const MaxFactorTiles = 36
const LegacyValidator = "math-v1"

type Bounds struct {
	Min int `json:"min"`
	Max int `json:"max"`
}

func (b Bounds) contains(n int) bool    { return n >= b.Min && n <= b.Max }
func (b Bounds) valid(ceiling int) bool { return b.Min >= 0 && b.Min <= b.Max && b.Max <= ceiling }
func (b *Bounds) UnmarshalJSON(data []byte) error {
	type plain Bounds
	if err := required(data, "min", "max"); err != nil {
		return err
	}
	return strictJSON(data, (*plain)(b))
}

type CountRules struct {
	A Bounds `json:"a"`
	B Bounds `json:"b"`
}

func (c *CountRules) UnmarshalJSON(data []byte) error {
	type plain CountRules
	if err := required(data, "a", "b"); err != nil {
		return err
	}
	return strictJSON(data, (*plain)(c))
}
func (c CountRules) answers() Bounds { return Bounds{c.A.Min + c.B.Min, c.A.Max + c.B.Max} }
func (c CountRules) validate() error {
	if !c.A.valid(MaxCountOperand) || !c.B.valid(MaxCountOperand) {
		return invalid("count operand bounds exceed the supported range")
	}
	return nil
}

type FactorRules struct {
	Total        int    `json:"total"`
	Widths       Bounds `json:"widths"`
	StartWidth   int    `json:"startWidth"`
	ExampleWidth int    `json:"exampleWidth"`
}

func (f FactorRules) validate() error {
	if f.Total < 1 || f.Total > MaxFactorTiles || !f.Widths.valid(f.Total) || f.Widths.Min < 1 || !f.Widths.contains(f.StartWidth) || !f.Widths.contains(f.ExampleWidth) {
		return invalid("invalid factor total, widths or example")
	}
	if f.Total%f.ExampleWidth != 0 {
		return invalid("factor example must fill a complete rectangle")
	}
	// Every mathematical pair must remain discoverable in an allowed orientation.
	for w := 1; w*w <= f.Total; w++ {
		if f.Total%w == 0 && !f.Widths.contains(w) && !f.Widths.contains(f.Total/w) {
			return invalid("factor widths omit a factor pair")
		}
	}
	return nil
}
func (f FactorRules) pairCount() int {
	n := 0
	for w := 1; w*w <= f.Total; w++ {
		if f.Total%w == 0 {
			n++
		}
	}
	return n
}
func (f FactorRules) frame(w, h int) bool {
	if w < 1 || h < 1 || w > f.Total || h > f.Total {
		return false
	}
	return (f.Widths.contains(w) && h == (f.Total+w-1)/w) || (f.Widths.contains(h) && w == (f.Total+h-1)/h)
}

type Rules struct {
	Count  *CountRules  `json:"count,omitempty"`
	Factor *FactorRules `json:"factor,omitempty"`
}

// ResolvedRules is the browser's server-owned contract, including derived values.
// It also represents the recognized legacy total-limited answer domain.
type ResolvedRules struct {
	Rules
	Answers   *Bounds `json:"answers,omitempty"`
	PairCount int     `json:"pairCount,omitempty"`
}
type LessonRef struct {
	ID       string `json:"lessonId"`
	Revision int    `json:"revision"`
}
type countDefinition struct {
	ID       string     `json:"id"`
	Revision int        `json:"revision"`
	Rules    CountRules `json:"rules"`
	Opening  [][2]int   `json:"opening"`
}
type factorDefinition struct {
	ID       string      `json:"id"`
	Revision int         `json:"revision"`
	Rules    FactorRules `json:"rules"`
}
type starterContent struct {
	Count  countDefinition  `json:"count"`
	Factor factorDefinition `json:"factor"`
}

func (s starterContent) validate() error {
	if s.Count.ID == "" || s.Count.Revision < 2 || s.Factor.ID == "" || s.Factor.Revision < 2 || s.Count.ID == s.Factor.ID {
		return invalid("invalid lesson identities")
	}
	if err := s.Count.Rules.validate(); err != nil {
		return err
	}
	if err := s.Factor.Rules.validate(); err != nil {
		return err
	}
	seen := map[[2]int]bool{}
	for _, p := range s.Count.Opening {
		if !s.Count.Rules.A.contains(p[0]) || !s.Count.Rules.B.contains(p[1]) || seen[p] {
			return invalid("invalid or duplicate opening pair")
		}
		seen[p] = true
	}
	return nil
}
func (c countDefinition) sequence() [][2]int {
	result := append([][2]int{}, c.Opening...)
	seen := map[[2]int]bool{}
	for _, p := range result {
		seen[p] = true
	}
	for a := c.Rules.A.Min; a <= c.Rules.A.Max; a++ {
		for b := c.Rules.B.Min; b <= c.Rules.B.Max; b++ {
			p := [2]int{a, b}
			if !seen[p] {
				result = append(result, p)
			}
		}
	}
	return result
}
func (s starterContent) reference(activity string) (LessonRef, error) {
	switch activity {
	case "count":
		return LessonRef{s.Count.ID, s.Count.Revision}, nil
	case "factor":
		return LessonRef{s.Factor.ID, s.Factor.Revision}, nil
	}
	return LessonRef{}, invalid("unsupported activity")
}
func (s starterContent) learnerRules(activity string, raw []byte) (ResolvedRules, error) {
	var ref LessonRef
	if err := strictJSON(raw, &ref); err != nil {
		return ResolvedRules{}, invalid("invalid learner lesson reference")
	}
	want, err := s.reference(activity)
	if err != nil {
		return ResolvedRules{}, err
	}
	if ref != want {
		return ResolvedRules{}, invalid("unknown learner lesson reference")
	}
	if activity == "count" {
		c := s.Count.Rules
		a := c.answers()
		return ResolvedRules{Rules: Rules{Count: &c}, Answers: &a}, nil
	}
	f := s.Factor.Rules
	return ResolvedRules{Rules: Rules{Factor: &f}, PairCount: f.pairCount()}, nil
}
func resolveRules(s Session) (ResolvedRules, error) {
	p := s.Parameters
	if s.Validator == LegacyValidator {
		if p.Rules != nil || s.LessonRevision != 1 {
			return ResolvedRules{}, invalid("unsupported legacy contract")
		}
		switch s.Activity {
		case "count":
			if s.LessonID != "count-combine" || p.A < 0 || p.B < 0 || p.A > 5 || p.B > 5 || p.A+p.B > 5 || p.Total != 0 {
				return ResolvedRules{}, invalid("invalid legacy counting parameters")
			}
			c := CountRules{Bounds{0, 5}, Bounds{0, 5}}
			a := Bounds{0, 5}
			return ResolvedRules{Rules: Rules{Count: &c}, Answers: &a}, nil
		case "factor":
			if s.LessonID != "factor-24" || p.Total != 24 || p.A != 0 || p.B != 0 {
				return ResolvedRules{}, invalid("invalid legacy factor parameters")
			}
			f := FactorRules{24, Bounds{1, 24}, 6, 6}
			return ResolvedRules{Rules: Rules{Factor: &f}, PairCount: f.pairCount()}, nil
		default:
			return ResolvedRules{}, invalid("unsupported legacy activity")
		}
	}
	if s.Validator != Validator || p.Rules == nil || s.LessonRevision < 2 || s.LessonID == "" {
		return ResolvedRules{}, invalid("missing rules or unsupported validator")
	}
	r := *p.Rules
	switch s.Activity {
	case "count":
		if r.Count == nil || r.Factor != nil {
			return ResolvedRules{}, invalid("expected counting rules")
		}
		if err := r.Count.validate(); err != nil {
			return ResolvedRules{}, err
		}
		if !r.Count.A.contains(p.A) || !r.Count.B.contains(p.B) || p.Total != 0 {
			return ResolvedRules{}, invalid("problem outside pinned operand bounds")
		}
		a := r.Count.answers()
		return ResolvedRules{Rules: r, Answers: &a}, nil
	case "factor":
		if r.Factor == nil || r.Count != nil {
			return ResolvedRules{}, invalid("expected factor rules")
		}
		if err := r.Factor.validate(); err != nil {
			return ResolvedRules{}, err
		}
		if p.Total != r.Factor.Total || p.A != 0 || p.B != 0 {
			return ResolvedRules{}, invalid("problem disagrees with pinned factor rules")
		}
		return ResolvedRules{Rules: r, PairCount: r.Factor.pairCount()}, nil
	}
	return ResolvedRules{}, invalid("unsupported activity")
}
func invalid(message string) error { return fmt.Errorf("%w: %s", ErrInvalid, message) }
func strictJSON(data []byte, out any) error {
	d := json.NewDecoder(bytes.NewReader(data))
	d.DisallowUnknownFields()
	if err := d.Decode(out); err != nil {
		return err
	}
	if err := d.Decode(&struct{}{}); err != io.EOF {
		return invalid("unexpected trailing JSON")
	}
	return nil
}
func required(data []byte, keys ...string) error {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(data, &fields); err != nil {
		return err
	}
	for _, key := range keys {
		v, ok := fields[key]
		if !ok || bytes.Equal(bytes.TrimSpace(v), []byte("null")) {
			return invalid("missing required field: " + key)
		}
	}
	return nil
}

func (c *countDefinition) UnmarshalJSON(data []byte) error {
	type plain countDefinition
	if err := required(data, "id", "revision", "rules", "opening"); err != nil {
		return err
	}
	if err := strictJSON(data, (*plain)(c)); err != nil {
		return err
	}
	// Fixed Go arrays otherwise silently pad/truncate malformed JSON arrays.
	var raw struct {
		Opening [][]*int `json:"opening"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	for _, p := range raw.Opening {
		if len(p) != 2 || p[0] == nil || p[1] == nil {
			return invalid("opening requires two integer operands")
		}
	}
	return nil
}
