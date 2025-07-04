#!/usr/bin/env bash
set -euo pipefail

# テストファイルが存在しないGoファイルに対してテストタスクを作成するスクリプト

# 設定
readonly UNTESTED_FILES_SCRIPT="$HOME/.claude/scripts/list_untested_go.sh"
readonly CLAUDE_CMD="$HOME/.claude/local/claude"
readonly TEMPLATE_FILE="$HOME/.claude/templates/add_tests_body.md"

# カウンター
created_count=0
excluded_count=0
error_count=0

# 依存ファイルの確認
check_dependencies() {
    local missing=()

    [[ ! -x "$UNTESTED_FILES_SCRIPT" ]] && missing+=("$UNTESTED_FILES_SCRIPT")
    [[ ! -x "$CLAUDE_CMD" ]] && missing+=("$CLAUDE_CMD")
    [[ ! -f "$TEMPLATE_FILE" ]] && missing+=("$TEMPLATE_FILE")

    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "❌ 必要なファイルが見つかりません:"
        printf "  - %s\n" "${missing[@]}"
        exit 1
    fi
}

# Claudeによるテスト可能性判定
judge_testability() {
    local file="$1"
    local result

    result=$(
        timeout 60 "$CLAUDE_CMD" -p "/judge-testable-go $file" </dev/null 2>/dev/null || echo ""
    )

    if [[ -z "$result" ]] || ! echo "$result" | jq -e . >/dev/null 2>&1; then
        return 1
    fi

    echo "$result"
}

# タスクファイルの作成
create_task_file() {
    local file="$1"
    local file_rel="${file#./}"
    local pkg_path="${file_rel%/*}"
    pkg_path="${pkg_path#pkg/}"

    local base_name=$(basename "$file_rel" .go)
    local task_file="test_${base_name}.md"
    local title="📦 テスト追加: ${file_rel}"

    # テンプレートから本文を生成
    local body=$(sed -e "s|{FILE}|${file_rel}|g" \
        -e "s|{PKG_PATH}|${pkg_path}|g" \
        "$TEMPLATE_FILE")

    # タスクファイル作成
    if ~/bin/task.sh add "$task_file" "${title}

${body}" >/dev/null 2>&1; then
        # メタデータ追加（エラーは無視）
        local current_branch=$(git branch --show-current 2>/dev/null || echo "main")
        ~/bin/md_prop.sh add "$task_file" "source_branch" "$current_branch"
        ~/bin/md_prop.sh add "$task_file" "tags" "auto generated"
        ~/bin/md_prop.sh add "$task_file" "assigner" "claude code"
        ~/bin/md_prop.sh add "$task_file" "created_date" "$(date '+%Y-%m-%d')"
        ~/bin/md_prop.sh add "$task_file" "source_file" "$file_rel"

        echo "$task_file"
        return 0
    fi

    return 1
}

# メイン処理
main() {
    echo "🔍 テストが無いGoファイルを検索中..."

    check_dependencies

    # テストが無いファイルを取得
    local files
    if ! files=$("$UNTESTED_FILES_SCRIPT"); then
        echo "❌ ファイルリストの取得に失敗しました"
        exit 1
    fi

    # ファイル数を確認
    local file_count=$(echo "$files" | grep -c . || echo 0)

    if [[ $file_count -eq 0 ]]; then
        echo "✅ テストが無いGoファイルはありません"
        exit 0
    fi

    echo "📊 対象ファイル数: $file_count"
    echo

    # 結果格納用の配列
    local created_tasks=()
    local excluded_files=()
    local error_files=()

    # 各ファイルを処理
    local current=0
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue

        current=$((current + 1))
        echo "[$current/$file_count] 処理中: $file"

        # Claudeによる判定
        local judge_result
        if ! judge_result=$(judge_testability "$file"); then
            echo "$judge_result"
            echo "  ❌ 判定エラー"
            error_files+=("$file|判定エラー")
            error_count=$((error_count + 1))
            continue
        fi

        local is_testable=$(echo "$judge_result" | jq -r '.testable // false')
        local reason=$(echo "$judge_result" | jq -r '.reason // "unknown"')

        if [[ "$is_testable" == "true" ]]; then
            echo "  ✅ テスト対象として判定"

            if task_file=$(create_task_file "$file"); then
                echo "  📝 タスク作成: $task_file"
                created_tasks+=("$file|$task_file")
                created_count=$((created_count + 1))
            else
                echo "  ❌ タスク作成失敗"
                error_files+=("$file|タスク作成失敗")
                error_count=$((error_count + 1))
            fi
        else
            echo "  ⏭️  除外: $reason"
            excluded_files+=("$file|$reason")
            excluded_count=$((excluded_count + 1))
        fi
        echo
    done <<<"$files"

    # 結果サマリー
    echo "📊 処理結果サマリー"
    echo "===================="

    if [[ $created_count -gt 0 ]]; then
        echo
        echo "✅ 作成したタスク ($created_count件):"
        for item in "${created_tasks[@]}"; do
            IFS='|' read -r file task <<<"$item"
            echo "  - $file → $task"
        done
    fi

    if [[ $excluded_count -gt 0 ]]; then
        echo
        echo "⏭️  除外したファイル ($excluded_count件):"
        for item in "${excluded_files[@]}"; do
            IFS='|' read -r file reason <<<"$item"
            echo "  - $file: $reason"
        done
    fi

    if [[ $error_count -gt 0 ]]; then
        echo
        echo "❌ エラー ($error_count件):"
        for item in "${error_files[@]}"; do
            IFS='|' read -r file error <<<"$item"
            echo "  - $file: $error"
        done
    fi

    echo
    echo "合計: 作成 $created_count / 除外 $excluded_count / エラー $error_count / 総数 $file_count"
}

main "$@"
