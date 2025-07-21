# 🧠 Intelligent Worker Type Selection Enhancement

## 🎯 PROBLEM ANALYSIS

### Current Issues:
1. **Limited UI Options**: Only 4/8 worker types shown in interactive selection
2. **No Objective-Based Selection**: Queen analysis doesn't drive worker type selection
3. **Manual Guessing**: Users must manually decide which worker types they need
4. **Incomplete Auto-scaling**: Missing 4 worker types from auto-scaling logic

### Missing Integration:
- Queen's `_identifyRequiredCapabilities()` result is **NOT** used for worker selection
- Interactive wizard doesn't leverage objective analysis
- CLI defaults to same 4 types regardless of objective

## 🚀 ENHANCED INTELLIGENT SELECTION

### 1. Objective-Driven Worker Selection
```javascript
// NEW: Automatic worker type recommendation based on objective
async function recommendWorkerTypes(objective, queenType = 'strategic') {
  const queen = new QueenCoordinator({ type: queenType });
  const analysis = await queen.analyzeObjective(objective);

  // Get required capabilities from queen analysis
  const requiredCapabilities = analysis.requiredCapabilities;

  // Add strategic worker types based on complexity
  const complexity = analysis.complexity;
  const additionalTypes = [];

  if (complexity === 'high' || complexity === 'very_high') {
    additionalTypes.push('architect', 'optimizer');
  }

  if (objective.toLowerCase().includes('document')) {
    additionalTypes.push('documenter');
  }

  if (objective.toLowerCase().includes('review') || complexity !== 'low') {
    additionalTypes.push('reviewer');
  }

  // Combine and deduplicate
  const allTypes = [...requiredCapabilities, ...additionalTypes];
  const uniqueTypes = [...new Set(allTypes)];

  return {
    recommended: uniqueTypes,
    reasoning: {
      components: analysis.requiredCapabilities,
      complexity: complexity,
      additional: additionalTypes
    }
  };
}
```

### 2. Enhanced Interactive Wizard
```javascript
// ENHANCED: Show all 8 worker types with smart defaults
const workerTypeRecommendation = await recommendWorkerTypes(answers.objective, answers.queenType);

const workerTypePrompt = {
  type: 'checkbox',
  name: 'workerTypes',
  message: `Select worker types (✨ Recommended for "${answers.objective}"):`,
  choices: [
    { name: '🔍 Researcher', value: 'researcher', checked: workerTypeRecommendation.recommended.includes('researcher') },
    { name: '💻 Coder', value: 'coder', checked: workerTypeRecommendation.recommended.includes('coder') },
    { name: '🏗️ Architect', value: 'architect', checked: workerTypeRecommendation.recommended.includes('architect') },
    { name: '📊 Analyst', value: 'analyst', checked: workerTypeRecommendation.recommended.includes('analyst') },
    { name: '🧪 Tester', value: 'tester', checked: workerTypeRecommendation.recommended.includes('tester') },
    { name: '⚡ Optimizer', value: 'optimizer', checked: workerTypeRecommendation.recommended.includes('optimizer') },
    { name: '📝 Documenter', value: 'documenter', checked: workerTypeRecommendation.recommended.includes('documenter') },
    { name: '👁️ Reviewer', value: 'reviewer', checked: workerTypeRecommendation.recommended.includes('reviewer') }
  ]
};

// Show reasoning
console.log(chalk.cyan('🎯 Recommendation based on:'));
console.log(chalk.gray(`  - Components: ${workerTypeRecommendation.reasoning.components.join(', ')}`));
console.log(chalk.gray(`  - Complexity: ${workerTypeRecommendation.reasoning.complexity}`));
if (workerTypeRecommendation.reasoning.additional.length > 0) {
  console.log(chalk.gray(`  - Additional: ${workerTypeRecommendation.reasoning.additional.join(', ')}`));
}
```

### 3. Smart CLI Defaults
```javascript
// ENHANCED: Intelligent CLI defaults
async function getWorkerTypes(flags, objective) {
  if (flags.workerTypes) {
    // User explicitly specified worker types
    return flags.workerTypes.split(',');
  }

  if (objective && !flags.interactive) {
    // Auto-recommend based on objective
    const recommendation = await recommendWorkerTypes(objective, flags.queenType);
    console.log(chalk.blue(`🧠 Auto-selected worker types based on objective: ${recommendation.recommended.join(', ')}`));
    return recommendation.recommended;
  }

  // Fallback to enhanced defaults (6 instead of 4)
  return ['researcher', 'coder', 'architect', 'analyst', 'tester', 'reviewer'];
}
```

### 4. Enhanced Auto-Scaling
```javascript
// ENHANCED: Complete auto-scaling logic
_determineWorkerType() {
  const pendingTasks = Array.from(this.state.tasks.values())
    .filter(t => t.status === 'pending');

  // Enhanced keyword mapping for all 8 worker types
  const typeScores = {};
  const keywordMap = {
    researcher: ['research', 'investigate', 'analyze', 'study', 'explore'],
    coder: ['code', 'implement', 'build', 'develop', 'fix', 'create', 'program'],
    architect: ['design', 'architecture', 'structure', 'system', 'plan', 'framework'],
    analyst: ['analyze', 'data', 'metrics', 'performance', 'report', 'measure'],
    tester: ['test', 'validate', 'quality', 'verify', 'qa', 'debug'],
    optimizer: ['optimize', 'performance', 'speed', 'efficiency', 'enhance'],
    documenter: ['document', 'explain', 'write', 'describe', 'guide', 'manual'],
    reviewer: ['review', 'feedback', 'audit', 'improve', 'refactor', 'critique']
  };

  pendingTasks.forEach(task => {
    const taskLower = task.description.toLowerCase();

    Object.entries(keywordMap).forEach(([workerType, keywords]) => {
      const matches = keywords.filter(keyword => taskLower.includes(keyword)).length;
      if (matches > 0) {
        typeScores[workerType] = (typeScores[workerType] || 0) + matches;
      }
    });
  });

  // Check current worker distribution to avoid over-concentration
  const currentWorkerTypes = Array.from(this.state.workers.values()).map(w => w.type);
  const typeCounts = {};
  currentWorkerTypes.forEach(type => {
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  // Penalize over-represented types
  Object.keys(typeScores).forEach(type => {
    const currentCount = typeCounts[type] || 0;
    const avgCount = currentWorkerTypes.length / Object.keys(typeCounts).length;
    if (currentCount > avgCount * 1.5) {
      typeScores[type] *= 0.5; // Reduce score for over-represented types
    }
  });

  // Return type with highest adjusted score
  const sorted = Object.entries(typeScores).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : 'coder'; // Default to coder
}
```

## 🎯 IMPLEMENTATION PRIORITY

### Phase 1: Fix Interactive Selection (High Priority)
- Add all 8 worker types to checkbox list
- Add objective-based recommendations
- Show reasoning for recommendations

### Phase 2: Intelligent CLI Defaults (Medium Priority)
- Auto-recommend worker types based on objective
- Enhanced default selection (6 types instead of 4)

### Phase 3: Enhanced Auto-Scaling (Medium Priority)
- Complete keyword mapping for all 8 types
- Worker distribution balancing
- Anti-concentration logic

### Phase 4: Advanced Selection (Low Priority)
- Learning from past successful worker combinations
- Dynamic rebalancing based on task success rates
- Consensus-driven worker type selection

## 📊 SUCCESS METRICS

- **User Experience**: Reduced manual worker type selection time
- **Accuracy**: Higher success rate for auto-recommended worker combinations
- **Coverage**: All 8 worker types properly utilized
- **Intelligence**: Objective-driven selection matches project needs

## 🔧 EXAMPLE IMPROVEMENTS

### Current Behavior:
```bash
# User has to guess which worker types they need
claude-flow hive-mind spawn "Build microservices API" --workers 6
# Always gets: researcher, coder, analyst, tester (missing architect, optimizer)
```

### Enhanced Behavior:
```bash
# Auto-analyzes objective and recommends optimal worker types
claude-flow hive-mind spawn "Build microservices API" --workers 6
# Output: "🧠 Auto-selected: researcher, coder, architect, tester, optimizer, reviewer"
# Reasoning: "Components: backend, api, system → Complexity: high → Added: architect, optimizer"
```

This enhancement transforms worker selection from manual guessing to intelligent, objective-driven recommendations.
