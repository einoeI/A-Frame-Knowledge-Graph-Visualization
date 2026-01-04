"""
Data Entry Helper Script
========================

Interactive CLI for entering user study data from paper questionnaires.

Usage:
    python data_entry_helper.py

Features:
    - Full session mode guides through all questionnaires in order
    - Validates input against allowed values
    - Shows ground truth for task verification
"""

import csv
from pathlib import Path
from datetime import datetime
import os

DATA_DIR = Path(__file__).parent / 'data' / 'raw'

# Ground truth for task correctness checking
GROUND_TRUTH = {
    'A': {'target': 'Legolas', 'strongest_link': 'Gimli', 'connections': 30, 'path': 'Sauron → Gildor', 'steps': 2},
    'B': {'target': 'Arwen', 'strongest_link': 'Aragorn', 'connections': 18, 'path': 'Thorin → Denethor', 'steps': 2}
}


def clear():
    os.system('cls' if os.name == 'nt' else 'clear')


def header(title):
    print(f"\n{'=' * 50}\n  {title}\n{'=' * 50}")


def section(title):
    print(f"\n  --- {title} ---")


def ask(prompt, options=None, allow_empty=False, as_int=False):
    """Get validated input."""
    while True:
        val = input(f"  {prompt}").strip()
        if allow_empty and val == '':
            return ''
        if as_int:
            try:
                return int(val)
            except ValueError:
                print("    Enter a number.")
                continue
        if options and val.lower() not in [o.lower() for o in options]:
            print(f"    Options: {', '.join(options)}")
            continue
        return val


def yes_no(prompt):
    return ask(f"{prompt} (y/n): ", ['y', 'n']).lower() == 'y'


# =============================================================================
# QUESTIONNAIRE ENTRY FUNCTIONS
# =============================================================================

def enter_participant():
    """Enter participant demographics."""
    clear()
    header("PARTICIPANT DEMOGRAPHICS")

    d = {}
    d['participant_id'] = ask("Participant ID: ", as_int=True)
    d['date'] = ask("Date [Enter=today]: ", allow_empty=True) or datetime.now().strftime('%Y-%m-%d')

    section("Personal")
    d['age'] = ask("Age: ", as_int=True)
    d['gender'] = ask("Gender (male/female/non-binary/prefer_not_to_say/other): ",
                      ['male', 'female', 'non-binary', 'prefer_not_to_say', 'other'])
    d['field_of_study'] = ask("Field of study/occupation: ")
    d['education'] = ask("Education (high_school/apprenticeship/meister/bachelor/master/phd): ",
                         ['high_school', 'apprenticeship', 'meister', 'bachelor', 'master', 'phd'])

    section("Experience")
    d['vr_experience'] = ask("VR experience (none/minimal/some/experienced): ",
                             ['none', 'minimal', 'some', 'experienced'])
    d['dataviz_experience'] = ask("Data viz experience (none/basic/intermediate/advanced): ",
                                  ['none', 'basic', 'intermediate', 'advanced'])
    d['lotr_familiarity'] = ask("LOTR familiarity (not_familiar/somewhat/very/expert): ",
                                ['not_familiar', 'somewhat', 'very', 'expert'])

    section("Session")
    d['health_conditions'] = ask("Health conditions (motion_sickness/visual/seizures/none): ")
    d['counterbalancing'] = ask("First system (2D_first/VR_first): ", ['2D_first', 'VR_first'])
    d['vr_type'] = ask("VR type (oculus/web_3d): ", ['oculus', 'web_3d'])
    d['task_set_first'] = ask("First task set (A/B): ", ['A', 'B'])
    d['task_set_second'] = 'B' if d['task_set_first'] == 'A' else 'A'
    d['notes'] = ask("Notes: ", allow_empty=True)

    save('participants.csv', d)
    print(f"\n  Saved participant {d['participant_id']}")
    return d['participant_id']


def enter_nasa_tlx(pid, system, order):
    """Enter NASA-TLX workload scores."""
    clear()
    header(f"NASA-TLX: {system} (condition {order})")
    print("  Scale: 0 (low) to 20 (high)")
    print("  Performance: 0=perfect, 20=failure")

    d = {'participant_id': pid, 'system': system, 'condition_order': order}

    section("Scores (0-20)")
    for scale in ['mental_demand', 'physical_demand', 'temporal_demand', 'performance', 'effort', 'frustration']:
        while True:
            val = ask(f"{scale.replace('_', ' ').title()}: ", as_int=True)
            if 0 <= val <= 20:
                d[scale] = val
                break
            print("    Enter 0-20")

    d['task_duration_seconds'] = ask("Duration (seconds, optional): ", allow_empty=True)

    save('nasa_tlx.csv', d)

    # Show Raw TLX
    raw = sum(d[s] for s in ['mental_demand', 'physical_demand', 'temporal_demand',
                              'performance', 'effort', 'frustration']) / 6 * 5
    print(f"\n  Saved. Raw TLX = {raw:.1f}/100")


def enter_task_performance(pid, system, task_set, vr_mode):
    """Enter task accuracy."""
    clear()
    header(f"TASK PERFORMANCE: {system}")

    gt = GROUND_TRUTH[task_set]
    print(f"  Task Set: {task_set}")
    print(f"  VR Mode: {vr_mode}")
    print(f"\n  Ground Truth:")
    print(f"    T1: {gt['target']} → {gt['strongest_link']} ({gt['connections']} connections)")
    print(f"    T2: {gt['path']} = {gt['steps']} steps")

    d = {
        'participant_id': pid,
        'system': system,
        'task_set': task_set,
        'vr_mode': vr_mode
    }

    section("Task 1: Node Exploration")
    d['t1_correct'] = yes_no("Correct?")

    section("Task 2: Pathfinding")
    d['t2_correct'] = yes_no("Correct?")

    save('task_performance.csv', d)
    print(f"\n  Saved: T1={'Y' if d['t1_correct'] else 'N'}, T2={'Y' if d['t2_correct'] else 'N'}")


def enter_comparative(pid):
    """Enter comparative questionnaire."""
    clear()
    header("COMPARATIVE QUESTIONNAIRE")

    d = {'participant_id': pid}

    section("Preferences (VR/2D/no_preference)")
    for q, label in [
        ('q1_overall_preference', 'Overall preference'),
        ('q2_immersion', 'More immersed'),
        ('q3_network_understanding', 'Better understanding'),
        ('q4_navigation_intuitive', 'More intuitive'),
        ('q5_relationships_clear', 'Clearer relationships')
    ]:
        d[q] = ask(f"{label}: ", ['VR', '2D', 'no_preference'])

    section("Scale: 1=VR better ... 5=2D better")
    d['q6_ease_of_use'] = ask("Ease of use (1-5): ", as_int=True)
    d['q7_future_choice'] = ask("Future choice (1-5): ", as_int=True)

    save('comparative.csv', d)
    print("\n  Saved.")


def enter_open_responses(pid):
    """Enter open-ended responses."""
    clear()
    header("OPEN-ENDED RESPONSES")
    print("  Press Enter to skip any question")

    d = {'participant_id': pid}

    section("VR")
    d['vr_advantages'] = ask("VR advantages: ", allow_empty=True)
    d['vr_disadvantages'] = ask("VR disadvantages: ", allow_empty=True)

    section("2D")
    d['2d_advantages'] = ask("2D advantages: ", allow_empty=True)
    d['2d_disadvantages'] = ask("2D disadvantages: ", allow_empty=True)

    section("Comparison")
    d['important_chars_easier'] = ask("Important chars easier in: ", allow_empty=True)
    d['relationships_easier'] = ask("Relationships easier in: ", allow_empty=True)
    d['other_comments'] = ask("Other comments: ", allow_empty=True)

    save('open_responses.csv', d)
    print("\n  Saved.")


# =============================================================================
# FULL SESSION
# =============================================================================

def enter_full_session():
    """Enter all data for one participant."""
    clear()
    header("FULL SESSION")
    print("  This will guide you through all questionnaires.")
    input("\n  Press Enter to start...")

    pid = enter_participant()
    input("\n  Press Enter to continue...")

    # Get session order
    clear()
    header("SESSION ORDER")
    first = ask("First system (2D/VR): ", ['2D', 'VR'])
    second = 'VR' if first == '2D' else '2D'
    first_task = ask("First task set (A/B): ", ['A', 'B'])
    second_task = 'B' if first_task == 'A' else 'A'
    vr_mode = ask("VR mode (headset/desktop): ", ['headset', 'desktop'])

    # First condition
    input(f"\n  Press Enter for {first} condition...")
    enter_task_performance(pid, first, first_task, vr_mode if first == 'VR' else 'n/a')
    input("\n  Press Enter for NASA-TLX...")
    enter_nasa_tlx(pid, first, 1)

    # Second condition
    input(f"\n  Press Enter for {second} condition...")
    enter_task_performance(pid, second, second_task, vr_mode if second == 'VR' else 'n/a')
    input("\n  Press Enter for NASA-TLX...")
    enter_nasa_tlx(pid, second, 2)

    # Final questionnaires
    input("\n  Press Enter for comparative...")
    enter_comparative(pid)
    input("\n  Press Enter for open responses...")
    enter_open_responses(pid)

    clear()
    header(f"SESSION COMPLETE: P{pid}")
    print("\n  All data saved.")


# =============================================================================
# UTILITIES
# =============================================================================

def save(filename, data):
    """Append row to CSV file."""
    path = DATA_DIR / filename
    with open(path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=data.keys())
        writer.writerow(data)


def main():
    while True:
        clear()
        header("DATA ENTRY")
        print("""
  1. Full session (recommended)
  2. Demographics only
  3. Task performance only
  4. NASA-TLX only
  5. Comparative only
  6. Open responses only
  0. Exit
""")
        choice = ask("Choice: ")

        if choice == '1':
            enter_full_session()
        elif choice == '2':
            enter_participant()
        elif choice == '3':
            pid = ask("Participant ID: ", as_int=True)
            sys = ask("System (2D/VR): ", ['2D', 'VR'])
            ts = ask("Task set (A/B): ", ['A', 'B'])
            vm = ask("VR mode (headset/desktop/n/a): ", ['headset', 'desktop', 'n/a'])
            enter_task_performance(pid, sys, ts, vm)
        elif choice == '4':
            pid = ask("Participant ID: ", as_int=True)
            sys = ask("System (2D/VR): ", ['2D', 'VR'])
            order = ask("Order (1/2): ", as_int=True)
            enter_nasa_tlx(pid, sys, order)
        elif choice == '5':
            pid = ask("Participant ID: ", as_int=True)
            enter_comparative(pid)
        elif choice == '6':
            pid = ask("Participant ID: ", as_int=True)
            enter_open_responses(pid)
        elif choice == '0':
            print("\n  Goodbye!")
            break

        input("\n  Press Enter to continue...")


if __name__ == '__main__':
    main()
